// src/app/components/mfa-verification-modal.tsx
"use client";

import { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface MfaVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>; 
  email: string; 
}

const MfaVerificationModal: React.FC<MfaVerificationModalProps> = ({ isOpen, onClose, onVerify, email }) => {
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!otpCode.trim()) {
      setError("Por favor, ingresa tu código de autenticación.");
      return;
    }
    setIsVerifying(true);
    setError(null);

    const success = await onVerify(otpCode);

    if (!success) {
      setError("El código de autenticación es incorrecto o ha expirado. Inténtalo de nuevo.");
      setOtpCode(""); 
    }
    // On success, the modal will typically be closed by the parent component after redirection or state change.
    setIsVerifying(false);
  };
  
  useEffect(() => {
    if (otpCode) setError(null);
  }, [otpCode]);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setOtpCode("");
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#1D3434] p-6 rounded-lg shadow-xl w-full max-w-sm text-[#F1C77A]">
        <h2 className="text-xl font-semibold mb-2 text-center">Verificación en Dos Pasos</h2>
        <p className="text-sm text-gray-300 mb-1 text-center">Se requiere un paso adicional para iniciar sesión.</p>
        <p className="text-sm text-gray-400 mb-4 text-center">
          Ingresa el código de la aplicación de autenticación para <span className="font-medium text-white break-all">{email}</span>.
        </p>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="otpCodeVerify" className="sr-only">Código de Autenticación</Label>
            <Input
              id="otpCodeVerify"
              type="text" // Changed to text to allow easier pasting on mobile, browsers handle number blocking
              inputMode="numeric" // Helps mobile keyboards show numeric pad
              pattern="[0-9]*"    // Helps with validation if needed, but maxLength is primary
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value;
                // Allow only numbers and limit length
                if (/^[0-9]*$/.test(val) && val.length <= 6) {
                  setOtpCode(val);
                }
              }}
              placeholder="123456"
              // maxLength={6} // Handled by onChange logic now
              className="text-center text-lg text-[#1D3434] bg-[#F1C77A] placeholder:text-gray-500"
              style={{ borderColor: '#F1C77A' }}
              onKeyPress={(event) => {
                if (event.key === 'Enter' && !isVerifying) {
                  handleSubmit();
                }
              }}
              autoFocus // Focus on the input when modal opens
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center py-1">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={isVerifying || otpCode.length !== 6} // Disable if not 6 digits
            className="w-full"
            style={{ backgroundColor: '#F1C77A', color: '#1D3434' }}
          >
            {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Verificar Código
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full" style={{ borderColor: '#F1C77A', color: '#F1C77A' }}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MfaVerificationModal;
