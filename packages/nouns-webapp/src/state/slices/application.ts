import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReactNode } from 'react';
import { grey } from '../../utils/alpBgColors';

export interface AlertModal {
  show: boolean;
  title?: ReactNode;
  message?: ReactNode;
}

interface ApplicationState {
  stateBackgroundColor: string;
  isCoolBackground: boolean;
  alertModal: AlertModal;
}

const initialState: ApplicationState = {
  stateBackgroundColor: grey,
  isCoolBackground: true,
  alertModal: {
    show: false,
  },
};

export const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    setStateBackgroundColor: (state, action: PayloadAction<string>) => {
      state.stateBackgroundColor = action.payload;

      let isCool: boolean = true;

      switch (action.payload) {
        case '#63a0f9':
          isCool = true;
          break;
        case '#018146':
          isCool = false;
          break;
        case '#000000':
          isCool = false;
          break;
        case '#76858b':
          isCool = false;
          break;
        case '#f8d689':
          isCool = true;
          break;
        case '#d5d7e1':
          isCool = true;
          break;
        case '#e1d7d5':
          isCool = true;
          break;
        default:
          isCool = true;
          break;
      }

      state.isCoolBackground = isCool;
    },
    setAlertModal: (state, action: PayloadAction<AlertModal>) => {
      state.alertModal = action.payload;
    },
  },
});

export const { setStateBackgroundColor, setAlertModal } = applicationSlice.actions;

export default applicationSlice.reducer;
