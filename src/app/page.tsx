'use client';
export default function HomePage() {
  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          height: 100vh;
          font-family: "Inter", system-ui, sans-serif;
          background: #181818;
          color: #eaeaea;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        h1 {
          position: absolute;
          top: 30px;
          width: 100%;
          text-align: center;
          font-size: 2.2rem;
          font-weight: 700;
          color: #e6a07c;
        }

        .container {
          text-align: center;
          z-index: 2;
        }

        .avatar {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 18px;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .docs-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #5fd3ff;
          font-size: 1rem;
          text-decoration: none;
          margin-top: 6px;
        }

        .docs-link:hover {
          text-decoration: underline;
        }

        .side-img {
          position: absolute;
          bottom: 0;
          width: 160px;
          opacity: 0.9;
        }

        .side-left {
          left: 20px;
        }

        .side-right {
          right: 20px;
          transform: scaleX(-1);
        }

        @media (max-width: 768px) {
          .side-img {
            display: none;
          }
        }
      `}</style>

      <h1>Welcome to API 🎉</h1>

      <div className="container">
        <div className="avatar">
          <img src="https://i.ibb.co/fV1PY2Sp/31931e0a88f3508db5b6ed00443f3fdf-removebg-preview.png" />
        </div>

        <a
          className="docs-link"
          href="https://github.com/your-repo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38
            0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
            -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87
            2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
            0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12
            0 0 .67-.21 2.2.82a7.65 7.65 0 012-.27c.68 0 1.36.09 2 .27
            1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
            .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95
            .29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2
            0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Click here to refer docs
        </a>
      </div>

      <img
        className="side-img side-left"
        src="https://i.ibb.co/S7ydK18t/discussion.png"
      />

      <img
        className="side-img side-right"
        src="https://i.ibb.co/S7ydK18t/discussion.png"
      />
    </>
  );
}