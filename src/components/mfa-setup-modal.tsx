// src/app/components/mfa-setup-modal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react"; 
// Ensure 'qr-code-styling' is added to package.json if you intend to use it.
// npm install qr-code-styling
import QRCodeStyling from 'qr-code-styling'; 

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MfaSetupModal: React.FC<MfaSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstanceRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setQrCodeData(null);
      setSecret(null);
      setOtpCode("");
      setError(null);
      setIsLoading(true);
      setIsVerifying(false);

      if (qrRef.current) {
        qrRef.current.innerHTML = ''; // Clear previous QR
      }

      fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.qrCode && data.secret) {
            setQrCodeData(data.qrCode); // This is barcode_uri
            setSecret(data.secret);
          } else {
            setError(data.error || "Error al generar el código QR para 2FA.");
          }
        })
        .catch((err) => {
          console.error("Error al habilitar 2FA:", err);
          setError("No se pudo conectar con el servidor para habilitar 2FA.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        if (qrRef.current) {
            qrRef.current.innerHTML = ''; // Clear QR when modal is closed
        }
    }
  }, [isOpen]);

  useEffect(() => {
    if (qrCodeData && qrRef.current && isOpen) { // Ensure modal is open before trying to append
      qrCodeInstanceRef.current = new QRCodeStyling({
        width: 250,
        height: 250,
        data: qrCodeData,
        image: "/memopsy-logo.png", // Make sure this path is correct in your public folder
        dotsOptions: {
          color: "#1D3434", // Dark color for dots
          type: "rounded"
        },
        backgroundOptions: {
          color: "#FFFFFF", // Pure white background for QR for better scanability
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 5,
          imageSize: 0.3
        },
        qrOptions: {
          errorCorrectionLevel: 'H' // High error correction
        }
      });
      if (qrRef.current) { // Double check ref before appending
        qrRef.current.innerHTML = ''; // Clear previous before appending
        qrCodeInstanceRef.current.append(qrRef.current);
      }
    }
  }, [qrCodeData, isOpen]); // Add isOpen to dependency array

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError("Por favor, ingresa el código de tu aplicación de autenticación.");
      return;
    }
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: otpCode }),
      });
      const data = await response.json();

      if (data.success) {
        onSuccess(); 
      } else {
        setError(data.error || "El código de verificación es incorrecto o ha expirado.");
      }
    } catch (err) {
      console.error("Error al verificar OTP:", err);
      setError("Error al verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#1D3434] p-6 rounded-lg shadow-xl w-full max-w-md text-[#F1C77A]">
        <h2 className="text-xl font-semibold mb-4 text-center">Activar Autenticación en Dos Pasos (2FA)</h2>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-[#F1C77A]" />
            <p className="mt-2 text-gray-300">Generando configuración...</p>
          </div>
        )}
        {!isLoading && error && !qrCodeData && (
           <div className="text-center text-red-400 mb-4 p-4 bg-red-900 bg-opacity-30 rounded">
             <p>Error al configurar 2FA:</p>
             <p>{error}</p>
             <Button onClick={onClose} variant="outline" className="mt-4 w-full" style={{ borderColor: '#F1C77A', color: '#F1C77A' }}>Cerrar</Button>
           </div>
        )}
        {!isLoading && qrCodeData && secret && (
          <>
            <p className="text-sm text-gray-300 mb-2">
              1. Escanea el siguiente código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.).
            </p>
            <div ref={qrRef} id="qr-canvas" className="flex justify-center my-4 p-2 bg-white rounded-md mx-auto" style={{ width: 250 + 4, height: 250 + 4 }}>
              {/* QR code will be appended here by useEffect */}
            </div>
            <p className="text-sm text-gray-300 mb-1">
              Si no puedes escanear el código, puedes ingresar manualmente la siguiente clave:
            </p>
            <p className="font-mono bg-gray-700 text-center text-white p-2 rounded mb-4 break-all text-sm">{secret}</p>
            
            <p className="text-sm text-gray-300 mb-2">
              2. Ingresa el código de 6 dígitos generado por tu aplicación:
            </p>
            <Label htmlFor="otpCodeSetup" className="sr-only">Código OTP</Label>
            <Input
              id="otpCodeSetup"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="text-center text-lg mb-2 text-[#1D3434] bg-[#F1C77A] placeholder:text-gray-500"
              style={{ borderColor: '#F1C77A' }}
            />
            {error && !isVerifying && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifying}
              className="w-full mb-2"
              style={{ backgroundColor: '#F1C77A', color: '#1D3434' }}
            >
              {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Activar y Verificar
            </Button>
          </>
        )}
        {!isLoading && (
          <Button onClick={onClose} variant="outline" className="w-full" style={{ borderColor: '#F1C77A', color: '#F1C77A' }}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
};

export default MfaSetupModal;
