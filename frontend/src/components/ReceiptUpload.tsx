import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ReceiptUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzed, setAnalyzed] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (type: 'camera' | 'file') => {
    setUploading(true);
    setProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setAnalyzed(true);
          toast({
            title: "Receipt Analyzed!",
            description: "AI extraction completed successfully",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    toast({
      title: "Processing Receipt",
      description: type === 'camera' ? "Analyzing camera capture..." : "Processing uploaded file...",
    });
  };

  const mockReceiptData = {
    merchant: "Grocery Plus",
    date: "2024-01-15",
    total: "$47.82",
    tax: "$3.82",
    items: [
      { name: "Organic Bananas", price: "$3.99", category: "Produce" },
      { name: "Milk 2%", price: "$4.29", category: "Dairy" },
      { name: "Bread", price: "$2.99", category: "Bakery" },
      { name: "Chicken Breast", price: "$12.99", category: "Meat" }
    ]
  };

  if (analyzed) {
    return (
      <Card className="p-6 max-w-md mx-auto animate-slide-up bg-card border-0 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-success" />
          <h3 className="text-lg font-semibold text-card-foreground">Receipt Analyzed</h3>
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
              <p className="font-medium text-primary">{mockReceiptData.total}</p>
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
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <p className="font-medium text-sm">{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary" size="sm">
              Add to Wallet
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnalyzed(false)}>
              Upload Another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto bg-card border-0 shadow-card">
      <div className="text-center mb-6">
        <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2 text-card-foreground">Upload Receipt</h3>
        <p className="text-muted-foreground text-sm">
          Capture or upload your receipt for AI analysis
        </p>
      </div>

      {uploading ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Analyzing receipt...</p>
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button 
            onClick={() => handleUpload('camera')} 
            className="w-full bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary"
            size="lg"
          >
            <Camera className="h-5 w-5 mr-2" />
            Take Photo
          </Button>
          
          <Button 
            onClick={() => handleUpload('file')} 
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
  );
};