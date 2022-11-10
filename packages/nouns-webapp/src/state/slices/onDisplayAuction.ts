import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OnDisplayAuctionState {
  lastAuctionAlpId: number | undefined;
  onDisplayAuctionAlpId: number | undefined;
}

const initialState: OnDisplayAuctionState = {
  lastAuctionAlpId: undefined,
  onDisplayAuctionAlpId: undefined,
};

const onDisplayAuction = createSlice({
  name: 'onDisplayAuction',
  initialState: initialState,
  reducers: {
    setLastAuctionAlpId: (state, action: PayloadAction<number>) => {
      state.lastAuctionAlpId = action.payload;
    },
    setOnDisplayAuctionAlpId: (state, action: PayloadAction<number>) => {
      state.onDisplayAuctionAlpId = action.payload;
    },
    setPrevOnDisplayAuctionAlpId: state => {
      if (!state.onDisplayAuctionAlpId) return;
      if (state.onDisplayAuctionAlpId === 0) return;
      state.onDisplayAuctionAlpId = state.onDisplayAuctionAlpId - 1;
    },
    setNextOnDisplayAuctionAlpId: state => {
      if (state.onDisplayAuctionAlpId === undefined) return;
      if (state.lastAuctionAlpId === state.onDisplayAuctionAlpId) return;
      state.onDisplayAuctionAlpId = state.onDisplayAuctionAlpId + 1;
    },
  },
});

export const {
  setLastAuctionAlpId,
  setOnDisplayAuctionAlpId,
  setPrevOnDisplayAuctionAlpId,
  setNextOnDisplayAuctionAlpId,
} = onDisplayAuction.actions;

export default onDisplayAuction.reducer;
