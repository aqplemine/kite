import { useEffect, useRef, useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import { useInView } from "react-intersection-observer";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

const PREVIEW_TIMEOUT_MS = 8_000;

export default function EmbedBase({
  src,
  params,
}: {
  src: string;
  params?: Record<string, string>;
}) {
  const { colorMode } = useColorMode();

  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0,
  });

  const queryParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      queryParams.set(key, value);
    }
  }

  if (colorMode === "dark") {
    queryParams.set("theme", "dark");
  }

  const url = `${customFields.appBaseUrl}${src}?${queryParams.toString()}`;

  return (
    <div style={{ margin: "20px 0" }} ref={ref}>
      {inView && <EmbedFrame key={url} url={url} />}
    </div>
  );
}

function EmbedFrame({ url }: { url: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dimensions, setDimensions] = useState({
    width: "100%",
    height: "160px",
  });
  const [hasResized, setHasResized] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const expectedOrigin = new URL(url).origin;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== expectedOrigin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "resize") {
        return;
      }

      const { width, height } = data;
      if (
        typeof width !== "number" ||
        typeof height !== "number" ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      setDimensions({ width: `${width}px`, height: `${height}px` });
      setHasResized(true);
      setShowFallback(false);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [url]);

  useEffect(() => {
    if (hasResized) {
      return;
    }

    const timeout = window.setTimeout(
      () => setShowFallback(true),
      PREVIEW_TIMEOUT_MS
    );
    return () => window.clearTimeout(timeout);
  }, [hasResized]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Kite block preview"
        src={url}
        onError={() => setShowFallback(true)}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: "100%",
          border: "none",
          borderRadius: "10px",
          overflow: "hidden",
          display: "block",
          minWidth: "0",
          minHeight: "0",
        }}
      />
      {showFallback && (
        <p role="status" style={{ marginTop: "0.5rem" }}>
          Having trouble viewing this preview?{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open it in a new tab
          </a>
          .
        </p>
      )}
    </>
  );
}
