import React from 'react';
import { Image } from 'react-bootstrap';
import classes from './AlpInfoRowButton.module.css';
import { useAppSelector } from '../../hooks';

interface AlpInfoRowButtonProps {
  iconImgSource: string;
  btnText: React.ReactNode;
  onClickHandler: () => void;
}

const AlpInfoRowButton: React.FC<AlpInfoRowButtonProps> = props => {
  const { iconImgSource, btnText, onClickHandler } = props;
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  return (
    <div
      className={isCool ? classes.alpButtonCool : classes.alpButtonWarm}
      onClick={onClickHandler}
    >
      <div className={classes.alpButtonContents}>
        <Image src={iconImgSource} className={classes.buttonIcon} />
        {btnText}
      </div>
    </div>
  );
};

export default AlpInfoRowButton;
