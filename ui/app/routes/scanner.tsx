import { CameraIcon, ScanBarcodeIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  createScanSession,
  getScannerCapabilities,
  getScanSessions,
} from "~/lib/api/resources";
import type { Route } from "./+types/scanner";

type Product = { name: string; brand: string | null; imageUrl: string | null };

export function meta() {
  return [{ title: "Scanner | Kombu" }];
}
export async function loader() {
  const [capabilities, sessions] = await Promise.all([
    getScannerCapabilities(),
    getScanSessions(),
  ]);
  return { capabilities, sessions };
}

export default function Scanner({ loaderData }: Route.ComponentProps) {
  const { capabilities, sessions } = loaderData;
  const revalidator = useRevalidator();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => () => controlsRef.current?.stop(), []);

  async function startScanner() {
    if (!videoRef.current) return;
    if (!window.isSecureContext) {
      setError("Camera access requires HTTPS (or localhost).");
      return;
    }
    setError(null);
    setCode(null);
    setProduct(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 250,
      });
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, _error, controls) => {
          if (!result) return;
          const value = result.getText();
          controls.stop();
          controlsRef.current = null;
          setScanning(false);
          setCode(value);
          const session = await createScanSession({
            scan_type: result.getBarcodeFormat().toString(),
            device_hint: "browser camera",
            raw_payload: value,
          });
          if (!session.error) revalidator.revalidate();
          await lookupProduct(value);
        },
      );
    } catch (scanError) {
      setScanning(false);
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Unable to access this camera.",
      );
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  async function lookupProduct(barcode: string) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,image_front_url`,
      );
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("status" in payload) ||
        payload.status !== 1 ||
        !("product" in payload) ||
        typeof payload.product !== "object" ||
        payload.product === null
      )
        return;
      const item = payload.product as Record<string, unknown>;
      const name =
        typeof item.product_name === "string" ? item.product_name : null;
      if (name)
        setProduct({
          name,
          brand: typeof item.brands === "string" ? item.brands : null,
          imageUrl:
            typeof item.image_front_url === "string"
              ? item.image_front_url
              : null,
        });
    } catch {
      /* A scan is still useful when the public catalogue has no match. */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Scanner"
        title="Scan a product"
        description="Use your phone camera to capture a barcode or QR code."
      />
      <SourceNotice results={[capabilities, sessions]} />
      {!isMobile ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CameraIcon />
            </EmptyMedia>
            <EmptyTitle>Camera scanning is for mobile</EmptyTitle>
            <EmptyDescription>
              Open Kombu on a phone over HTTPS to scan a barcode. Desktop stays
              focused on reviewing scan history.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="relative aspect-[3/4] bg-muted">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-lg border-2 border-primary" />
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            {scanning ? (
              <>
                <span className="text-muted-foreground text-sm">
                  Point at the barcode
                </span>
                <Button variant="outline" size="sm" onClick={stopScanner}>
                  <XIcon data-icon="inline-start" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground text-sm">
                  Ready when you are
                </span>
                <Button size="sm" onClick={startScanner}>
                  <ScanBarcodeIcon data-icon="inline-start" />
                  Scan code
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Camera unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {code && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          {product?.imageUrl && (
            <img
              className="size-12 rounded-md object-cover"
              src={product.imageUrl}
              alt=""
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium">{product?.name ?? "Code saved"}</div>
            <div className="truncate text-muted-foreground text-sm">
              {product?.brand ?? code}
            </div>
          </div>
          <Badge variant="secondary">Saved</Badge>
        </div>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-sm">Recent scans</h2>
          <Badge variant="secondary">{sessions.data.length}</Badge>
        </div>
        {sessions.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Your scanned codes will appear here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {sessions.data.map((session, index) => (
              <div
                className={`flex items-center gap-3 px-4 py-3 ${index ? "border-t" : ""}`}
                key={session.id}
              >
                <ScanBarcodeIcon className="text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">
                    {session.raw_payload ?? session.scan_type}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {session.device_hint ?? "Scanner"}
                  </div>
                </div>
                <StatusBadge value={session.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
