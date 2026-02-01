import React, { useMemo } from 'react';

const LogoBackground: React.FC = () => {
  const logoPositions = useMemo(() => 
    Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 6 + Math.random() * 4
    })), []
  );
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {logoPositions.map((pos, i) => (
        <div
          key={i}
          className="absolute w-6 h-6 opacity-5 z-500 animate-logo-fade"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            animationDelay: `${pos.delay}s`,
            animationDuration: `${pos.duration}s`
          }}
        >
          <img 
            src="https://ipfs.io/ipfs/bafkreifn2verhnir6r3lj6rmu4tdtmcpoyfl7epvm7y2nvpwsubbha6ora" 
            alt="trenchws-launchpad logo" 
            className="w-full h-full"
          />
        </div>
      ))}
    </div>
  );
};

export default LogoBackground;
