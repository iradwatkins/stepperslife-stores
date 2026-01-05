"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import QrScanner from "qr-scanner";
import { QrCode, ArrowLeft, CheckCircle, XCircle, Camera, Clock, Play, Square, LogIn } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function EventScanningPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualTicketCode, setManualTicketCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string>("");
  const [lastScannedCode, setLastScannedCode] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const stats = useQuery(api.scanning.queries.getEventScanStats, { eventId: eventId as any });
  const recentScans = useQuery(api.scanning.queries.getRecentScans, {
    eventId: eventId as any,
    limit: 10,
  });
  const scanTicket = useMutation(api.scanning.mutations.scanTicket);

  // Show login required screen if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center text-white max-w-md px-6">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="text-white/80 mb-8">
            You must be logged in as a staff member, organizer, or admin to scan tickets.
          </p>
          <Link
            href={`/login?redirect=/scan/${eventId}`}
            className="inline-block px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-white/90 transition-colors"
          >
            Log In to Continue
          </Link>
          <button
            onClick={() => router.push("/scan")}
            className="block w-full mt-4 px-6 py-3 text-white/80 hover:text-white transition-colors"
          >
            Back to Event Selection
          </button>
        </div>
      </div>
    );
  }

  const processTicket = async (ticketCode: string) => {
    // Prevent scanning the same code multiple times in a row
    if (ticketCode === lastScannedCode) return;

    setLastScannedCode(ticketCode);
    setIsProcessing(true);

    try {
      const result = await scanTicket({
        ticketCode: ticketCode.trim(),
        eventId: eventId as any,
      });

      setLastScanResult(result);

      // Auto-clear after 3 seconds, then ready for next scan
      setTimeout(() => {
        setLastScanResult(null);
        setLastScannedCode(""); // Allow re-scanning after flash clears
      }, 3000);
    } catch (error) {
      console.error("Scan error:", error);
      setLastScanResult({
        success: false,
        error: "SCAN_ERROR",
        message: "Failed to process ticket. Please try again.",
      });
      setTimeout(() => {
        setLastScanResult(null);
        setLastScannedCode("");
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current || scannerRef.current) return;

    setIsStarting(true);
    setScannerError("");

    try {
      // Set worker path for Next.js
      QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();

      if (!hasCamera) {
        throw new Error("No camera detected on this device");
      }

      // List available cameras
      const cameras = await QrScanner.listCameras(true);

      // Set video element attributes before initializing scanner
      if (videoRef.current) {
        videoRef.current.setAttribute("autoplay", "");
        videoRef.current.setAttribute("muted", "");
        videoRef.current.setAttribute("playsinline", "");
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {

          // Extract ticket code from URL or use directly
          let ticketCode = result.data;
          if (result.data.includes("/ticket/")) {
            const parts = result.data.split("/ticket/");
            ticketCode = parts[1];
          }

          // Scanner keeps running for continuous scanning
          processTicket(ticketCode);
        },
        {
          onDecodeError: (error) => {
            // Don't log every frame decode error, too noisy
            // console.log("Decode error:", error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 5,
        }
      );


      await scanner.start();


      scannerRef.current = scanner;

      // Expose scanner to window for debugging
      if (typeof window !== "undefined") {
        (window as any).scanner = scanner;
      }

      setIsScanning(true);
      setIsStarting(false);
    } catch (error: any) {
      console.error("❌ Scanner error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);

      let errorMessage = "Failed to start camera.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on this device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another app.";
      } else {
        errorMessage = error?.message || errorMessage;
      }

      setScannerError(errorMessage);
      setIsScanning(false);
      setIsStarting(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualTicketCode.trim()) return;
    await processTicket(manualTicketCode);
    setManualTicketCode("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (stats === undefined) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/scan")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Event Scanner</h1>
              <p className="text-muted-foreground text-sm">Scan tickets to check in attendees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.scanned}</div>
              <div className="text-xs text-muted-foreground">Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.remaining}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${stats.percentageScanned}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Live QR Scanner */}
          <div className="bg-primary rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <QrCode className="w-7 h-7" />
              Live QR Scanner
            </h2>

            {/* Video Preview - Simplified like demo */}
            <div className="relative bg-card rounded-xl mb-4" style={{ minHeight: "300px" }}>
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Camera not active</p>
                  </div>
                </div>
              )}

              <div style={{ lineHeight: 0 }}>
                <video
                  ref={videoRef}
                  id="qr-video"
                  style={{
                    width: "100%",
                    maxHeight: "400px",
                    objectFit: "cover",
                    borderRadius: "0.75rem",
                  }}
                />
              </div>
            </div>

            {/* Scanner Controls */}
            <div className="space-y-3">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  disabled={isStarting}
                  className="w-full px-6 py-4 bg-card text-primary rounded-xl font-bold text-lg hover:bg-accent transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? (
                    <>
                      <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Starting Camera...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6" />
                      Start Scanner
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="bg-success/20 border border-success rounded-lg p-3">
                    <p className="text-foreground text-sm text-center font-semibold">
                      ✓ Scanner Active - Point at QR codes to scan
                    </p>
                  </div>
                  <button
                    onClick={stopScanner}
                    className="w-full px-6 py-4 bg-destructive text-destructive-foreground rounded-xl font-bold text-lg hover:bg-destructive/90 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Square className="w-6 h-6" />
                    Stop Scanner
                  </button>
                </>
              )}

              {scannerError && (
                <div className="bg-destructive/20 border border-destructive rounded-lg p-4">
                  <p className="text-foreground text-sm text-center font-semibold mb-2">
                    {scannerError}
                  </p>
                  <p className="text-muted-foreground text-xs text-center">
                    Make sure you're using HTTPS and have granted camera permissions.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="bg-primary rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-primary-foreground mb-4 text-center">
              Or Enter Code Manually
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={manualTicketCode}
                onChange={(e) => setManualTicketCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleManualScan()}
                placeholder="TKT-XXXXXXXX"
                className="w-full px-4 py-3 text-center text-xl font-mono font-bold bg-card text-foreground rounded-lg focus:outline-none focus:ring-4 focus:ring-ring uppercase"
                disabled={isProcessing}
              />
              <button
                onClick={handleManualScan}
                disabled={!manualTicketCode.trim() || isProcessing}
                className="w-full px-6 py-3 bg-card text-primary rounded-lg font-bold hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Checking..." : "Check In"}
              </button>
            </div>
          </div>

          {/* Full-Screen Scan Result Flash */}
          {lastScanResult && (
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center animate-in fade-in ${
                lastScanResult.success ? "bg-success" : "bg-destructive"
              }`}
            >
              <div className="text-center px-6 max-w-md">
                {lastScanResult.success ? (
                  <CheckCircle className="w-32 h-32 text-success-foreground mx-auto mb-6 animate-in zoom-in" />
                ) : (
                  <XCircle className="w-32 h-32 text-destructive-foreground mx-auto mb-6 animate-in zoom-in" />
                )}
                <h3 className="text-4xl font-bold text-foreground mb-4">
                  {lastScanResult.success ? "✓ Valid Ticket!" : "✗ Invalid"}
                </h3>
                <p className="text-foreground text-xl mb-6">{lastScanResult.message}</p>
                {lastScanResult.ticket && (
                  <div className="bg-card/20 backdrop-blur-sm rounded-xl p-6 text-foreground space-y-2">
                    {lastScanResult.ticket.attendeeName && (
                      <p className="text-2xl font-bold">{lastScanResult.ticket.attendeeName}</p>
                    )}
                    {lastScanResult.ticket.tierName && (
                      <p className="text-lg">{lastScanResult.ticket.tierName}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Scans */}
          {recentScans && recentScans.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Scans
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentScans.map((scan, index) => (
                  <div key={index} className="bg-card rounded p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-foreground font-medium">{scan.attendeeName}</div>
                      <div className="text-muted-foreground text-xs">
                        {scan.scannedAt && format(scan.scannedAt, "h:mm a")}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">{scan.tierName}</div>
                    {scan.soldByStaffName && (
                      <div className="text-primary text-xs mt-1 flex items-center gap-1">
                        <span>👤</span>
                        Sold by: {scan.soldByStaffName}
                        {scan.paymentMethod && scan.paymentMethod !== "ONLINE" && (
                          <span className="ml-2 px-2 py-0.5 bg-primary/20 rounded text-xs">
                            {scan.paymentMethod}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
