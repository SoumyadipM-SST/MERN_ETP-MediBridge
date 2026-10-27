let loading;
export function loadJitsi() {
  if (window.JitsiMeetExternalAPI)
    return Promise.resolve(window.JitsiMeetExternalAPI);
  if (!loading)
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        loading = null;
        reject(
          new Error(
            "Jitsi could not load. Check your network or content blocker, then retry.",
          ),
        );
      };
      const timer = setTimeout(fail, 20000);
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onerror = fail;
      script.onload = () => {
        if (!window.JitsiMeetExternalAPI) {
          fail();
          return;
        }
        clearTimeout(timer);
        resolve(window.JitsiMeetExternalAPI);
      };
      document.head.append(script);
    });
  return loading;
}
