import React, { useState, useEffect } from "react";
import { onToast, onLoadingChange, on } from "../lib/core";

export const Toast: React.FC = () => {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootNotice, setBootNotice] = useState(false);

  useEffect(() => {
    let timer: any;
    const unsubToast = onToast((message) => {
      setMsg(message);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 2000);
    });

    const unsubLoading = onLoadingChange((isLoading) => {
      setLoading(isLoading);
    });

    on("boot_notice", (show: boolean) => {
      setBootNotice(show);
    });

    return () => {
      unsubToast();
      unsubLoading();
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <div className={`loading-bar ${loading ? "on" : ""}`} id="loadbar" />

      {bootNotice && (
        <div
          className="notice warn"
          id="boot"
          style={{
            position: "fixed",
            left: "50%",
            top: "70px",
            transform: "translateX(-50%)",
            zIndex: 95,
            boxShadow: "var(--float)",
          }}
        >
          Veri yükleniyor… ilk açılışta birkaç saniye sürer.
        </div>
      )}

      <div
        className={`toast ${visible ? "on" : ""}`}
        id="toast"
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    </>
  );
};
