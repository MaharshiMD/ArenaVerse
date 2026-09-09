import React, { useEffect, useRef } from 'react';

const NativeBanner = () => {
  const bannerRef = useRef();

  useEffect(() => {
    if (bannerRef.current && !bannerRef.current.hasChildNodes()) {
      const script = document.createElement('script');
      script.async = true;
      script.dataset.cfasync = 'false';
      script.src = 'https://pl31254502.profitableratecpmnetwork.com/64cc97e7dafd8c932690101c74b53778/invoke.js';
      bannerRef.current.appendChild(script);

      const container = document.createElement('div');
      container.id = 'container-64cc97e7dafd8c932690101c74b53778';
      bannerRef.current.appendChild(container);
    }
  }, []);

  return <div ref={bannerRef} style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '100px' }}></div>;
};

export default NativeBanner;
