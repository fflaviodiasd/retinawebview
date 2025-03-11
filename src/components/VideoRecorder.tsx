import { useRef, useState, useCallback } from "react";
import { Square, Download, Eye, EyeOff } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Logo from './logo2.png';

interface Frame {
  id: number;
  uri: string;
  fileName: string;
  takenAt: Date;
  selected: boolean;
  eyeSide: "OD" | "OE";
}

export function VideoFrameExtractor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const globalFrameId = useRef<number>(0);

  const [frames, setFrames] = useState<Frame[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [eyeSide, setEyeSide] = useState<"OD" | "OE">("OD");

  const extractFrames = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    setIsExtracting(true);
    video.muted = true;

    frameIntervalRef.current = window.setInterval(() => {
      if (video.paused || video.ended) {
        stopExtracting();
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageSrc = canvas.toDataURL("image/png");
      const fileName = `frame_${globalFrameId.current}_${eyeSide}.png`;

      const newFrame: Frame = {
        id: globalFrameId.current,
        uri: imageSrc,
        fileName,
        takenAt: new Date(),
        selected: false,
        eyeSide,
      };

      setFrames((prev) => [...prev, newFrame]);
      globalFrameId.current += 1;
    }, 500);

    video.play();
  }, [eyeSide]);

  const stopExtracting = useCallback(() => {
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsExtracting(false);
  }, []);

  const toggleFrameSelection = (id: number) => {
    setFrames((prevFrames) =>
      prevFrames.map((frame) =>
        frame.id === id ? { ...frame, selected: !frame.selected } : frame
      )
    );
  };

  const downloadSelectedImages = async () => {
    const selectedFrames = frames.filter((frame) => frame.selected);
    if (selectedFrames.length === 0) {
      alert("Nenhuma imagem foi selecionada, todas serão baixadas.");
      return;
    }

    const zip = new JSZip();
    const odFolder = zip.folder("OD");
    const oeFolder = zip.folder("OE");

    selectedFrames.forEach((frame) => {
      const base64Data = frame.uri.split(",")[1];
      if (frame.eyeSide === "OD") {
        odFolder?.file(frame.fileName, base64Data, { base64: true });
      } else {
        oeFolder?.file(frame.fileName, base64Data, { base64: true });
      }
    });

    const framesInfo = selectedFrames.map((frame) => ({
      id: frame.id,
      fileName: frame.fileName,
      eyeSide: frame.eyeSide,
      takenAt: frame.takenAt.toISOString(),
    }));
    zip.file("frames_info.json", JSON.stringify(framesInfo, null, 2));

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "frames_selecionados.zip");
  };

  const downloadAllImages = () => {
    const framesToDownload = frames.filter((frame) => frame.selected).length > 0
      ? frames.filter((frame) => frame.selected) 
      : frames; 
  
    if (framesToDownload.length === 0) {
      alert("Nenhuma imagem disponível para download.");
      return;
    }
  

    alert(`${framesToDownload.length} imagens serão baixadas. Confirme os downloads no seu navegador.`);
  

    framesToDownload.forEach((frame) => {
      const link = document.createElement("a");
      link.href = frame.uri;
      link.download = frame.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setFrames([]);

      const video = videoRef.current;
      if (video) {
        video.src = URL.createObjectURL(file);
      }
    }
  };

  return (
    <>
      <header className="flex flex-row items-center justify-center gap-4 bg-[#00B7D0] mb-6 px-4 py-2 rounded-lg shadow-lg shadow-black/50">
        <h1 className="text-white text-lg font-bold">Retina Fácil</h1>
        <img src={Logo} alt="Logo" className="w-12 h-12" />
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-row items-center justify-center gap-4 bg-[#00B7D0] mx-8 mb-6 px-4 py-2 rounded-lg shadow-lg shadow-black/50">
          <label htmlFor="videoUpload" className="text-white cursor-pointer font-medium">
            Escolher Vídeo
          </label>
          <input
            type="file"
            accept="video/*"
            id="videoUpload"
            onChange={handleVideoUpload}
            className="hidden"
          />
        </div>

        {videoFile && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button
              onClick={extractFrames}
              disabled={isExtracting}
              className={`flex items-center gap-2 px-4 py-2 bg-[#00B7D0] rounded-lg text-white text-sm sm:text-base ${
                isExtracting ? "opacity-50" : "hover:bg-[#0099B0]"
              }`}
            >
              📷 Iniciar Extração
            </button>

            <button
              onClick={stopExtracting}
              disabled={!isExtracting}
              className={`flex items-center gap-2 px-4 py-2 bg-[#00B7D0] rounded-lg text-white text-sm sm:text-base ${
                isExtracting ? "hover:bg-[#0099B0]" : "opacity-50"
              }`}
            >
              <Square className="w-4 h-4" /> Parar Extração
            </button>

            <button
              onClick={downloadAllImages}
              disabled={frames.length === 0}
              className={`flex items-center gap-2 px-4 py-2 bg-[#00B7D0] rounded-lg text-white text-sm sm:text-base ${
                frames.length > 0 ? "hover:bg-[#0099B0]" : "opacity-50"
              }`}
            >
              <Download className="w-4 h-4" /> Baixar Frames
            </button>

            <button
              onClick={() => setEyeSide((prev) => (prev === "OD" ? "OE" : "OD"))}
              className="flex items-center gap-2 px-4 py-2 bg-[#00B7D0] rounded-lg text-white text-sm sm:text-base hover:bg-[#0099B0]"
            >
              {eyeSide === "OD" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {eyeSide === "OD" ? "OD" : "OE"}
            </button>
          </div>
        )}
        <div className="relative mt-4">
          <video ref={videoRef} playsInline style={{ width: "1px", height: "1px", opacity: 0 }} />
          <canvas ref={canvasRef}  style={{ display: "none" }}   />

          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(frames.length / 50) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {frames.map((frame) => (
              <div
                key={frame.id}
                className={`relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer ${
                  frame.selected ? "border-2 border-blue-500" : ""
                }`}
                onClick={() => toggleFrameSelection(frame.id)} 
              >
                <img
                  src={frame.uri}
                  alt={`Frame ${frame.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                  {frame.fileName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
