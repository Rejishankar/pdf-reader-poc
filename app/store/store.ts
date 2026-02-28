import { configureStore } from '@reduxjs/toolkit';
import pdfReducer from './pdfSlice';

export const store = configureStore({
  reducer: {
    pdf: pdfReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore File objects in the state
        ignoredActions: ['pdf/setFile'],
        ignoredPaths: ['pdf.file'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
