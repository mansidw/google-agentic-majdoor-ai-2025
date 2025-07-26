import React, { useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface PhotoCaptureUploaderProps {
  onClose: () => void;
  onSuccess: (data: any) => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const API_ENDPOINT = backendUrl + "/api/analyze_receipt";

export const PhotoCaptureUploader: React.FC<PhotoCaptureUploaderProps> = ({
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  React.useEffect(() => {
    if (!captured && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          setMediaStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => setError("Unable to access camera"));
    }
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [captured]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        setCaptured(canvasRef.current.toDataURL("image/png"));
      }
    }
  };

  const handleUpload = async () => {
    if (!captured) return;
    setLoading(true);
    setError(null);
    try {
      const blob = await (await fetch(captured)).blob();
      const formData = new FormData();
      formData.append("file", blob, "receipt.png");
      const res = await axios.post(API_ENDPOINT, formData);
      onSuccess(res.data);
    } catch (e) {
      setError("Upload failed");
    } finally {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Capture Receipt Photo</h3>
        {!captured ? (
          <div className="flex flex-col items-center">
            <video
              ref={videoRef}
              width={400}
              height={300}
              className="rounded mb-4"
            />
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              style={{ display: "none" }}
            />
            <Button onClick={handleCapture} className="w-full mb-2">
              Capture Photo
            </Button>
            <Button variant="outline" onClick={() => {
              if (mediaStream) {
                mediaStream.getTracks().forEach((track) => track.stop());
                setMediaStream(null);
              }
              if (videoRef.current) {
                videoRef.current.srcObject = null;
              }
              onClose();
            }} className="w-full">
              Cancel
            </Button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <img
              src={captured}
              alt="Captured"
              className="rounded mb-4 w-full"
            />
            <Button
              onClick={handleUpload}
              className="w-full mb-2"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload Photo"}
            </Button>
            <Button variant="outline" onClick={() => {
              if (mediaStream) {
                mediaStream.getTracks().forEach((track) => track.stop());
                setMediaStream(null);
              }
              if (videoRef.current) {
                videoRef.current.srcObject = null;
              }
              onClose();
            }} className="w-full">
              Cancel
            </Button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
