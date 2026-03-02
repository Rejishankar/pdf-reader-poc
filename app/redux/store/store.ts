import { configureStore } from '@reduxjs/toolkit';
import pdfReducer from '../reducer/pdfReducer';

export const store = configureStore({
  reducer: {
    pdf: pdfReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['pdf/setFile'],
        ignoredPaths: ['pdf.file'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
