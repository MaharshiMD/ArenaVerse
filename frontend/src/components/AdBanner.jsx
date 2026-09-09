import React, { useEffect, useRef } from 'react';

const AdBanner = ({ width, height, dataKey, format = 'iframe' }) => {
  const bannerRef = useRef();

  useEffect(() => {
    // Only inject if it hasn't been injected yet
    if (bannerRef.current && !bannerRef.current.hasChildNodes()) {
      const conf = document.createElement('script');
      conf.type = 'text/javascript';
      conf.innerHTML = `atOptions = {
        'key' : '${dataKey}',
        'format' : '${format}',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };`;
      bannerRef.current.appendChild(conf);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://www.highrevenueformat.com/${dataKey}/invoke.js`;
      bannerRef.current.appendChild(script);
    }
  }, [dataKey, height, width, format]);

  return <div ref={bannerRef} style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', overflow: 'hidden' }}></div>;
};

export default AdBanner;
