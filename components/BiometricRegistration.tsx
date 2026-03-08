import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, ShieldCheck, AlertTriangle, ScanLine, Loader2, Fingerprint, Check, Activity } from 'lucide-react';
import { analyzeBiometricFraud, validateGovernmentIdDocument } from '../services/geminiService';
import { getBiometricCapabilities, registerWebAuthn, type AuthenticatorMode, type BiometricCapabilities } from '../services/cryptoService';
import { VoterProfile } from '../types';
import { connectWallet, getConnectedWallet } from '../services/ethereumService';

interface Props {
  onComplete: (profile: VoterProfile) => void;
}

const BiometricRegistration: React.FC<Props> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const livenessCanvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isValidatingId, setIsValidatingId] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [idDocType, setIdDocType] = useState('');
  const [idConfidence, setIdConfidence] = useState<number | null>(null);
  const [idReason, setIdReason] = useState('');
  const [idAge, setIdAge] = useState<number>(0);
  const [idDob, setIdDob] = useState('');
  const [isIdAdult, setIsIdAdult] = useState(false);
  const [isIdServiceAvailable, setIsIdServiceAvailable] = useState(true);

  const [isRunningLiveness, setIsRunningLiveness] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);

  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities>({
    webAuthnSupported: false,
    platformAuthenticatorAvailable: false,
  });
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const [fingerprintCaptured, setFingerprintCaptured] = useState(false);
  const [fingerprintMethod, setFingerprintMethod] = useState<AuthenticatorMode | null>(null);

  const [generatedVoterId, setGeneratedVoterId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [humanProofCode, setHumanProofCode] = useState<string | null>(null);

  const isIpOrigin = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(window.location.hostname) || window.location.hostname.includes(':');

  useEffect(() => {
    void startCamera();
    void getConnectedWallet().then((address) => {
      if (address) setWalletAddress(address);
    }).catch(() => {
      // ignore wallet pre-check failures
    });
    void getBiometricCapabilities().then(setBiometricCapabilities);

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const grabFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement): Uint8ClampedArray | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };

  const estimateMotionScore = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
    let changed = 0;
    const totalPixels = Math.min(a.length, b.length) / 4;
    for (let i = 0; i < totalPixels; i++) {
      const o = i * 4;
      const dr = Math.abs(a[o] - b[o]);
      const dg = Math.abs(a[o + 1] - b[o + 1]);
      const db = Math.abs(a[o + 2] - b[o + 2]);
      if ((dr + dg + db) / 3 > 18) changed++;
    }
    return Number(((changed / totalPixels) * 100).toFixed(2));
  };

  const runLivenessChallenge = async () => {
    if (!videoRef.current || !livenessCanvasRef.current || !stream) {
      setError('Camera stream is not active.');
      return;
    }

    setError(null);
    setIsRunningLiveness(true);
    setLivenessPassed(false);
    setLivenessScore(null);

    try {
      const frameA = grabFrame(videoRef.current, livenessCanvasRef.current);
      if (!frameA) throw new Error('Failed to capture first frame.');

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const frameB = grabFrame(videoRef.current, livenessCanvasRef.current);
      if (!frameB) throw new Error('Failed to capture second frame.');

      const motionScore = estimateMotionScore(frameA, frameB);
      setLivenessScore(motionScore);

      if (motionScore < 1.2) {
        setError('Liveness check failed: no sufficient live movement detected. Please move your face and retry.');
        return;
      }

      if (motionScore > 45) {
        setError('Liveness check unstable: excessive scene movement detected. Hold camera steady and retry.');
        return;
      }

      setLivenessPassed(true);
    } catch (e: any) {
      setError(e.message || 'Liveness verification failed.');
    } finally {
      setIsRunningLiveness(false);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!livenessPassed) {
      setError('Complete liveness challenge first.');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
      }
    }
  }, [livenessPassed]);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed for ID verification (JPG/PNG/WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ID image is too large. Please upload an image under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        if (img.width < 300 || img.height < 180) {
          setError('ID image resolution is too low. Upload a clearer ID photo.');
          setIsIdVerified(false);
          return;
        }

        setError(null);
        setIdImage(result);
        setIsIdVerified(false);
        setIsValidatingId(true);
        setIdDocType('');
        setIdConfidence(null);
        setIdReason('');
        setIdAge(0);
        setIdDob('');
        setIsIdAdult(false);
        setIsIdServiceAvailable(true);

        try {
          const validation = await validateGovernmentIdDocument(result);
          setIdDocType(validation.documentType || 'Unknown');
          setIdConfidence(validation.confidence);
          setIdReason(validation.reasoning || '');
          setIdAge(validation.age || 0);
          setIdDob(validation.dob || '');
          setIsIdAdult(Boolean(validation.isAdult));
          setIsIdServiceAvailable(validation.serviceAvailable);

          if (!validation.serviceAvailable) {
            setIsIdVerified(false);
            setError(validation.reasoning);
            return;
          }

          const isSupportedDoc = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving License'].includes(validation.documentType);
          const accepted = validation.isGovernmentId
            && isSupportedDoc

            && validation.hasDob
            && validation.isAdult
            && validation.confidence >= 45;
          if (!accepted) {
            setIsIdVerified(false);
            setError(`Invalid ID upload: ${validation.reasoning}. Required: supported ID, visible face + DOB, age >= 18, confidence >= 55%.`);
            return;
          }

          setIsIdVerified(true);
        } catch (err: any) {
          setIsIdVerified(false);
          setError(err?.message || 'Government ID verification failed.');
        } finally {
          setIsValidatingId(false);
        }
      };
      img.onerror = () => {
        setError('Invalid ID image file. Please try another image.');
        setIsIdVerified(false);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleBiometricEnroll = async (mode: AuthenticatorMode) => {
    try {
      setError(null);
      setIsRegisteringBiometric(true);

      const credentialId = await registerWebAuthn('voter-temp-id', mode);
      if (!credentialId) {
        throw new Error('Biometric enrollment was cancelled or failed.');
      }

      setFingerprintCaptured(true);
      setFingerprintMethod(mode);
    } catch (e: any) {
      setError(e.message || 'Biometric enrollment failed.');
    } finally {
      setIsRegisteringBiometric(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setError(null);
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (e: any) {
      setError(e.message || 'MetaMask connection failed.');
    }
  };

  const handleVerification = async () => {
    if (!capturedImage || !idImage || !isIdVerified || !fingerprintCaptured || !walletAddress || !livenessPassed) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const fraudResult = await analyzeBiometricFraud(idImage, capturedImage);
      if (!fraudResult.isSafe) {
        setError(`Verification Failed: ${fraudResult.reasoning}`);
        return;
      }

      const generatedCode = `HUMAN-100-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const regRes = await fetch('/api/register-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          biometricHash: `bio-${Math.random().toString(36).slice(2, 12)}`,
          humanProofCode: generatedCode,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed');

      setGeneratedVoterId(regData.voterId);
      setHumanProofCode(regData.humanProofCode || generatedCode);
    } catch (e: any) {
      setError(`System error: ${e.message}. Please ensure the server and wallet are available.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (generatedVoterId) {
    return (
      <div className="max-w-md mx-auto animate-in zoom-in-95 duration-500">
        <div className="glass-card p-8 rounded-3xl border border-emerald-200 bg-emerald-50 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 border border-emerald-200">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Registration Verified</h2>
            <p className="text-slate-600 text-sm">Your biometric profile has been verified. <br /> Use your Digital Voter ID to log in.</p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl space-y-4 relative group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Official Digital Voter ID</p>
            <div className="text-2xl font-mono font-bold text-emerald-600 select-all tracking-wider">{generatedVoterId}</div>
            <p className="text-[10px] text-slate-500">Please save this ID. It is required for voting.</p>
          </div>

          <div className="bg-white border border-emerald-200 shadow-sm p-4 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">100% Human Verification Code</p>
            <div className="text-lg font-mono font-bold text-emerald-700 select-all tracking-wider">{humanProofCode || 'HUMAN-100-VERIFIED'}</div>
          </div>

          <button
            onClick={() => onComplete({ id: generatedVoterId, name: 'Verified Citizen', isVerified: true, fraudRiskScore: 0.01, walletAddress: walletAddress || undefined, humanProofCode: humanProofCode || undefined })}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            Continue to Secure Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <ScanLine className="w-6 h-6 text-emerald-600" />
          Biometric Identity Verification
        </h2>
        <p className="text-slate-600">Complete the multimodal biometric enrollment to generate your secure voting credentials.</p>
      </div>

      {isIpOrigin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-center justify-between gap-3">
          <p className="text-sm">Biometric WebAuthn is blocked on IP origin. Use <strong>http://localhost:3000</strong>.</p>
          <button
            onClick={() => {
              const nextUrl = window.location.href.replace('127.0.0.1', 'localhost');
              window.location.href = nextUrl;
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-700 text-white rounded-md hover:bg-amber-600 transition"
          >
            Open localhost
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <h3 className="text-lg font-semibold text-slate-900">1. Government ID</h3>
          {idImage ? (
            <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300">
              <img src={idImage} alt="ID" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setIdImage(null);
                  setIsIdVerified(false);
                  setIdDocType('');
                  setIdConfidence(null);
        setIdReason('');
                  setIdAge(0);
                  setIdDob('');
                  setIsIdAdult(false);
                }}
                className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full hover:bg-red-600 transition text-white"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span></p>
                <p className="text-xs text-slate-500">PNG, JPG, or WebP (max 5MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleIdUpload} />
            </label>
          )}
          <div className="text-xs font-mono text-slate-600 text-center">
            {isValidatingId
              ? 'ID Status: VALIDATING...'
              : (idImage
                ? (!isIdServiceAvailable
                  ? 'ID Status: SERVICE UNAVAILABLE'
                  : `ID Status: ${isIdVerified ? 'VERIFIED' : 'REJECTED'}${idDocType ? ` | Type: ${idDocType}` : ''}${idDob ? ` | DOB: ${idDob}` : ''}${idAge > 0 ? ` | Age: ${idAge}` : ''}${idConfidence !== null ? ` | Confidence: ${idConfidence}%` : ''}`)
                : 'ID Status: NOT UPLOADED')}
          </div>
          {!!idReason && !isValidatingId && (
            <p className={`text-xs text-center ${isIdVerified ? 'text-emerald-700' : 'text-rose-700'}`}>{idReason}</p>
          )}
        </div>

        <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <h3 className="text-lg font-semibold text-slate-900">2. Facial Recognition + Liveness</h3>
          <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center group">
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover transform scale-x-[-1]" />
                <div className="absolute inset-0 border-2 border-emerald-500/50 pointer-events-none"></div>
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/80 px-2 py-1 rounded text-xs text-white font-mono">
                  <Check className="w-3 h-3" /> Face Captured
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                {!stream && <p className="text-slate-500 absolute inset-0 flex items-center justify-center">Camera inactive</p>}
              </div>
            )}
            <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>
            <canvas ref={livenessCanvasRef} width="320" height="240" className="hidden"></canvas>
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={runLivenessChallenge}
              disabled={!stream || isRunningLiveness}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isRunningLiveness ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {isRunningLiveness ? 'Running Liveness...' : 'Run Liveness Check'}
            </button>

            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={!stream || !livenessPassed}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Camera className="w-4 h-4" /> Scan Face
              </button>
            ) : (
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setLivenessPassed(false);
                  setLivenessScore(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition"
              >
                Retake
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-slate-600">
            Liveness: {livenessPassed ? `PASS (${livenessScore ?? 0}% motion)` : (livenessScore === null ? 'NOT RUN' : `FAILED (${livenessScore}% motion)`)}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">3. Biometric Device Enrollment</h3>
        <p className="text-slate-600 text-sm text-center max-w-md">Use your built-in biometric reader or an external connected authenticator. Simulated fingerprint is disabled.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          <button
            onClick={() => handleBiometricEnroll('platform')}
            disabled={isIpOrigin || isRegisteringBiometric || !biometricCapabilities.webAuthnSupported || !biometricCapabilities.platformAuthenticatorAvailable || fingerprintCaptured}
            className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Enroll In-Built Reader
          </button>
          <button
            onClick={() => handleBiometricEnroll('cross-platform')}
            disabled={isIpOrigin || isRegisteringBiometric || !biometricCapabilities.webAuthnSupported || fingerprintCaptured}
            className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Enroll External Device
          </button>
        </div>

        <div className="text-xs font-mono text-slate-600 text-center">
          WebAuthn: {biometricCapabilities.webAuthnSupported ? 'SUPPORTED' : 'UNSUPPORTED'} | Built-in Reader: {biometricCapabilities.platformAuthenticatorAvailable ? 'DETECTED' : 'NOT DETECTED'}
        </div>

        <div className="h-6">
          {isRegisteringBiometric ? (
            <span className="text-indigo-600 font-mono text-sm font-semibold inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Waiting for device confirmation...
            </span>
          ) : fingerprintCaptured ? (
            <span className="text-emerald-600 font-mono text-sm flex items-center gap-2 font-semibold">
              <Fingerprint className="w-4 h-4" />
              Biometric device enrolled ({fingerprintMethod === 'platform' ? 'in-built' : 'external'})
            </span>
          ) : (
            <span className="text-slate-500 text-sm">Complete one biometric device enrollment to continue.</span>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center gap-4">
        <h3 className="text-lg font-semibold text-slate-900">4. Connect MetaMask Wallet</h3>
        <p className="text-slate-600 text-sm text-center max-w-md">Your vote transaction will be signed directly by your wallet on Ethereum.</p>
        <button onClick={handleConnectWallet} className="px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-full font-semibold transition">
          {walletAddress ? 'Wallet Connected' : 'Connect MetaMask'}
        </button>
        <p className="text-xs font-mono text-slate-500 break-all text-center">{walletAddress || 'No wallet connected'}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <button
          onClick={handleVerification}
          disabled={!idImage || !isIdVerified || !capturedImage || !fingerprintCaptured || !walletAddress || !livenessPassed || isAnalyzing || isValidatingId}
          className={`relative overflow-hidden group flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition-all ${(!idImage || !isIdVerified || !capturedImage || !fingerprintCaptured || !walletAddress || !livenessPassed || isValidatingId) ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'}`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying & Generating Credentials...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Complete Registration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BiometricRegistration;








