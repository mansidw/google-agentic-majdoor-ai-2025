import { IMockReceiptData } from "@/components/ReceiptUpload";
import { it } from "node:test";

// TypeScript function to transform IMockReceiptData to abc.json schema
export function transformReceiptToWalletObject(receipt: IMockReceiptData) {
  const receipt_items =
    receipt.items.map((item) => {
      return `${item.description} (${item.price})`;
    }) ?? [];

  return {
    state: "ACTIVE",
    heroImage: {
      sourceUri: {
        uri: "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/google-io-hero-demo-only.png",
      },
      contentDescription: {
        defaultValue: {
          language: "en-US",
          value: "Grocery image description",
        },
      },
    },
    textModulesData: [
      {
        header: "Merchant",
        body: receipt.merchant,
        id: "MERCHANT_MODULE",
      },
      {
        header: "Date",
        body: receipt.date,
        id: "DATE_MODULE",
      },
      {
        header: "Total",
        body: `${receipt.currency} ${receipt.total}`,
        id: "TOTAL_MODULE",
      },
      {
        header: "Tax",
        body: `${receipt.currency} ${receipt.tax}`,
        id: "TAX_MODULE",
      },
      {
        header: "Items",
        body: receipt_items.join(", "),
        id: "ITEMS_MODULE",
      },
    ],
    linksModuleData: {
      uris: [],
    },
    barcode: { type: "QR_CODE", value: JSON.stringify(receipt) },
    cardTitle: {
      defaultValue: {
        language: "en-US",
        value: `Receipt for ${receipt.merchant}`,
      },
    },
    header: {
      defaultValue: { language: "en-US", value: "Receipt Details" },
    },
    hexBackgroundColor: "#4285f4",
    logo: {
      sourceUri: {
        uri: "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg",
      },
      contentDescription: {
        defaultValue: { language: "en-US", value: "Generic card logo" },
      },
    },
  };
}
