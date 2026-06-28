export function ModeToast({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 bottom-12 z-50 -translate-x-1/2 px-6 py-2 border-2 font-bold text-sm transition-all duration-300"
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        backgroundColor: '#1a1a1a',
        color: '#d8cbb0',
        borderTopColor: '#555555',
        borderLeftColor: '#555555',
        borderBottomColor: '#C6C6C6',
        borderRightColor: '#C6C6C6',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0px' : '8px'})`,
      }}
    >
      {label}
    </div>
  )
}
