/**
 * Tilt Card Component
 * Wraps children with VanillaTilt 3D effect
 */

import { useEffect, useRef } from 'react';
import VanillaTilt from 'vanilla-tilt';

const TiltCard = ({ children, className = '', options = {} }) => {
  const tiltRef = useRef(null);

  useEffect(() => {
    const tiltNode = tiltRef.current;
    if (!tiltNode) return;

    const defaultOptions = {
      max: 15,
      speed: 1000,
      glare: true,
      'max-glare': 0.2,
      scale: 1.05,
      ...options,
    };

    VanillaTilt.init(tiltNode, defaultOptions);

    return () => {
      if (tiltNode.vanillaTilt) {
        tiltNode.vanillaTilt.destroy();
      }
    };
  }, []);

  return (
    <div ref={tiltRef} className={className}>
      {children}
    </div>
  );
};

export default TiltCard;

