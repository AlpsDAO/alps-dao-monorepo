import { Button } from 'react-bootstrap';
import classes from './AlpModal.module.css';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Alp from '../../../components/Alp';
import { svg2png } from '../../../utils/svg2png';
import { Backdrop } from '../../../components/Modal';

const downloadAlpPNG = (png: string) => {
  const downloadEl = document.createElement('a');
  downloadEl.href = png;
  downloadEl.download = 'alp.png';
  downloadEl.click();
};

const AlpModal: React.FC<{ onDismiss: () => void; svg: string }> = props => {
  const { onDismiss, svg } = props;

  const [width, setWidth] = useState<number>(window.innerWidth);
  const [png, setPng] = useState<string | null>();

  const isMobile: boolean = width <= 991;

  const handleWindowSizeChange = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', handleWindowSizeChange);

    const loadPng = async () => {
      setPng(await svg2png(svg, 512, 512));
    };
    loadPng();

    return () => {
      window.removeEventListener('resize', handleWindowSizeChange);
    };
  }, [svg]);

  return (
    <>
      {ReactDOM.createPortal(
        <Backdrop
          onDismiss={() => {
            onDismiss();
          }}
        />,
        document.getElementById('backdrop-root')!,
      )}
      {ReactDOM.createPortal(
        <div className={classes.modal}>
          {png && (
            <Alp
              imgPath={png}
              alt="alp"
              className={classes.alpImg}
              wrapperClassName={classes.alpWrapper}
            />
          )}
          <div className={classes.displayAlpFooter}>
            <span>Use this Alp as your profile picture!</span>
            {!isMobile && png && (
              <Button
                onClick={() => {
                  downloadAlpPNG(png);
                }}
              >
                Download
              </Button>
            )}
          </div>
        </div>,
        document.getElementById('overlay-root')!,
      )}
    </>
  );
};
export default AlpModal;
