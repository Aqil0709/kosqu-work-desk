// frontend/src/pages/admin/PTTM/components/Toast.jsx

export default function Toast({ message }) {
  return <div className={`toast ${message ? 'on' : ''}`}>{message}</div>;
}
