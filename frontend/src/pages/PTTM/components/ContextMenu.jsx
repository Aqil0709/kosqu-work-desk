// frontend/src/pages/admin/PTTM/components/ContextMenu.jsx

export default function ContextMenu({ menu, onAbove, onBelow, onDuplicate, onDelete, onClose }) {
  if (!menu) return null;
  return (
    <div id="ctx" style={{ left: menu.x, top: menu.y }} onClick={onClose}>
      <div className="ci2" onClick={onAbove}>↑ Insert row above</div>
      <div className="ci2" onClick={onBelow}>↓ Insert row below</div>
      <div className="ci2" onClick={onDuplicate}>⎘ Duplicate row</div>
      <div className="cs2" />
      <div className="ci2 d" onClick={onDelete}>🗑 Delete row</div>
    </div>
  );
}
