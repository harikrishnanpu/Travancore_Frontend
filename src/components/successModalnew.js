// src/components/SuccessModal.jsx
import React from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function SuccessModal({ open, onClose, message, onConfirm }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="text-center">
        <Typography variant="h6" className="text-green-600 mb-4">
          Success!
        </Typography>
        <Typography variant="body1">{message}</Typography>
      </DialogContent>
      <DialogActions className="justify-center">
        <Button onClick={navigate('/')} variant="contained" color="success">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
