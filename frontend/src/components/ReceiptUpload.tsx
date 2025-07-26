import { useState } from "react";
import { PhotoCaptureUploader } from "@/components/PhotoCaptureUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, FileText, CheckCircle, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { transformReceiptToWalletObject } from "@/utils/transformToWalletObject";
import axios from "axios";
import { generate_object_suffix } from "@/utils/object_suffix";

export interface IMockReceiptData {
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
  const [addingToWallet, setAddingToWallet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzed, setAnalyzed] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [mockReceiptData, setMockReceiptData] = useState<IMockReceiptData>();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

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
          setIsEditing(true); // Start in editing mode
          toast({
            title: "Receipt Analyzed!",
            description: "AI extraction completed successfully. Please review and edit if needed.",
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
    setIsEditing(true); // Start in editing mode

    toast({
      title: "Receipt Analyzed!",
      description: "AI extraction completed successfully. Please review and edit if needed.",
    });
    // Optionally, handle data from API
  };

  const handleFieldChange = (field: keyof IMockReceiptData, value: string | number) => {
    if (!mockReceiptData) return;
    setMockReceiptData({
      ...mockReceiptData,
      [field]: value,
    });
  };

  const handleItemChange = (index: number, field: 'description' | 'price', value: string | number) => {
    if (!mockReceiptData) return;
    const updatedItems = [...mockReceiptData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setMockReceiptData({
      ...mockReceiptData,
      items: updatedItems,
    });
  };

  const addNewItem = () => {
    if (!mockReceiptData) return;
    setMockReceiptData({
      ...mockReceiptData,
      items: [...mockReceiptData.items, { description: '', price: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (!mockReceiptData) return;
    const updatedItems = mockReceiptData.items.filter((_, i) => i !== index);
    setMockReceiptData({
      ...mockReceiptData,
      items: updatedItems,
    });
  };

  const handleAddToWallet = async () => {
    setAddingToWallet(true);
    try {
      const API_ENDPOINT = backendUrl + "/api/create-wallet-object";
      const payload = {
        class_suffix: "GroceryClass",
        object_suffix: generate_object_suffix(),
        object_data: transformReceiptToWalletObject(mockReceiptData),
      };

      const res = await axios.post(API_ENDPOINT, payload);

      if (res.status !== 200) {
        throw new Error("Failed to add to wallet");
      }

      if (res.data) {
        const WALLET_ENDPOINT = backendUrl + "/api/get-wallet-link";
        const wallet_link = await axios.post(WALLET_ENDPOINT, res.data);
        if (wallet_link.status != 200 || !wallet_link.data) {
          throw new Error("Failed to get wallet link");
        }
        window.open(wallet_link.data.saveUrl, "_blank");
        toast({
          title: "Added to Wallet",
          description: "Your receipt has been added to Google Wallet",
        });
      }
      // Optionally, handle response data
    } catch (err) {
      toast({
        title: "Add to Wallet Failed",
        description: "Could not add receipt to wallet.",
        variant: "destructive",
      });
    } finally {
      setAddingToWallet(false);
    }
  };

  if (analyzed && mockReceiptData) {
    return (
      <Card className="p-6 max-w-md mx-auto animate-slide-up bg-card border-0 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-success" />
          <h3 className="text-lg font-semibold text-card-foreground">
            Receipt Analyzed
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="ml-auto"
          >
            <Edit3 className="h-4 w-4" />
            {isEditing ? 'View' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-sm text-muted-foreground">Merchant</Label>
              {isEditing ? (
                <Input
                  value={mockReceiptData.merchant}
                  onChange={(e) => handleFieldChange('merchant', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{mockReceiptData.merchant}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Date</Label>
              {isEditing ? (
                <Input
                  value={mockReceiptData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{mockReceiptData.date}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Total</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={mockReceiptData.total}
                  onChange={(e) => handleFieldChange('total', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-primary">
                  {mockReceiptData.total}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Tax</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={mockReceiptData.tax}
                  onChange={(e) => handleFieldChange('tax', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{mockReceiptData.tax}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-card-foreground">Items</h4>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNewItem}
                  className="text-xs"
                >
                  Add Item
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {mockReceiptData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-muted/50 rounded gap-2"
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="px-2"
                      >
                        ×
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-sm">{item.description}</p>
                      </div>
                      <p className="font-medium text-sm">{item.price}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary"
              size="sm"
              onClick={handleAddToWallet}
              disabled={addingToWallet || isEditing}
            >
              {addingToWallet ? "Adding..." : "Add to Wallet"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyzed(false)}
              disabled={addingToWallet}
            >
              Upload Another
            </Button>
          </div>
          {isEditing && (
            <p className="text-xs text-muted-foreground text-center">
              Click "View" to finish editing before adding to wallet
            </p>
          )}
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
              className="w-full bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary"
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
