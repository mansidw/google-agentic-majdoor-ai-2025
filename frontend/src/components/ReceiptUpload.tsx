import { useState } from "react";
import { PhotoCaptureUploader } from "@/components/PhotoCaptureUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IMockReceiptData {
  currency: string;
  date: string;
  merchant: string;
  tax: number;
  total: number;
  items: Array<{
    description: string;
    price: number;
  }>;
}
export const ReceiptUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzed, setAnalyzed] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [mockReceiptData, setMockReceiptData] = useState<IMockReceiptData>();
  const { toast } = useToast();

  const handlePhotoCancel = () => {
    setShowPhotoCapture(false);
  };

  const handleUpload = async (type: "camera" | "file") => {
    if (type === "camera") {
      setShowPhotoCapture(true);
      return;
    }
    // Open file picker and upload file to API
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      setProgress(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        // You may want to use VITE_BACKEND_URL here
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const API_ENDPOINT = backendUrl + "/api/analyze_receipt";
        const res = await (
          await import("axios")
        ).default.post(API_ENDPOINT, formData);
        if (res.status !== 200 || res.data.merchant == null) {
          setUploading(false);
          setAnalyzed(false);
          toast({
            title: "Analysis Failed",
            description: "Could not extract data from the receipt.",
            variant: "destructive",
          });

          return;
        } else {
          setUploading(false);
          setAnalyzed(true);
          setMockReceiptData(res.data);
          toast({
            title: "Receipt Analyzed!",
            description: "AI extraction completed successfully",
          });
          // Optionally handle response data
        }
      } catch (err) {
        setUploading(false);
        toast({
          title: "Upload Failed",
          description: "Could not process the file.",
        });
      }
    };
    input.click();
  };

  const handlePhotoSuccess = (data: IMockReceiptData) => {
    if (data.merchant == null) {
      setAnalyzed(false);
      setShowPhotoCapture(false);
      toast({
        title: "Analysis Failed",
        description: "Could not extract data from the receipt.",
        variant: "destructive",
      });
      return;
    }
    setMockReceiptData(data);
    setShowPhotoCapture(false);
    setAnalyzed(true);

    toast({
      title: "Receipt Analyzed!",
      description: "AI extraction completed successfully",
    });
    // Optionally, handle data from API
  };

  if (analyzed && mockReceiptData) {
    return (
      <Card className="p-6 max-w-md mx-auto animate-slide-up bg-card border-0 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-success" />
          <h3 className="text-lg font-semibold text-card-foreground">
            Receipt Analyzed
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Merchant</p>
              <p className="font-medium">{mockReceiptData.merchant}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{mockReceiptData.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium text-primary">
                {mockReceiptData.total}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax</p>
              <p className="font-medium">{mockReceiptData.tax}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-card-foreground">Items</h4>
            <div className="space-y-2">
              {mockReceiptData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-muted/50 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                  </div>
                  <p className="font-medium text-sm">{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm">
              Add to Wallet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyzed(false)}
            >
              Upload Another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {showPhotoCapture && (
        <PhotoCaptureUploader
          onClose={handlePhotoCancel}
          onSuccess={handlePhotoSuccess}
        />
      )}
      <Card className="p-6 max-w-md mx-auto bg-card border-0 shadow-card">
        <div className="text-center mb-6">
          <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2 text-card-foreground">
            Upload Receipt
          </h3>
          <p className="text-muted-foreground text-sm">
            Capture or upload your receipt for AI analysis
          </p>
        </div>

        {uploading ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Analyzing receipt...
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => handleUpload("camera")}
              className="w-full bg-gradient-primary border-0"
              size="lg"
            >
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
            </Button>
            <Button
              onClick={() => handleUpload("file")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload from Gallery
            </Button>
          </div>
        )}
      </Card>
    </>
  );
};
