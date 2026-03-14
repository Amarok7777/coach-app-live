// Shared mobile-optimized controls for Training and Matches

// Rating: two rows of 5 on mobile, one row of 10 on desktop
export function RatingPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map(n => {
        const active = n <= (value || 0)
        const color  = n <= 4 ? (active ? '#ef4444' : '') : n <= 7 ? (active ? '#f59e0b' : '') : (active ? '#22c55e' : '')
        return (
          <button key={n} type="button"
            onClick={() => onChange(value === n ? null : n)}
            style={active ? {background: color, color:'white', borderColor: color} : {}}
            className={`w-8 h-8 rounded-lg border text-sm font-semibold transition-all active:scale-95 ${
              active ? 'border-transparent' : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >{n}</button>
        )
      })}
      {value && (
        <button type="button" onClick={() => onChange(null)}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-xs hover:bg-gray-100">✕</button>
      )}
    </div>
  )
}

// Minutes picker: "Voll" pill + optional custom input
export function MinutesPicker({ value, fullLabel, onChange }) {
  const isCustom = value !== null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button"
        onClick={() => onChange(null)}
        style={!isCustom ? {background:'var(--md-primary)', color:'white', borderColor:'var(--md-primary)'} : {}}
        className={`h-9 px-4 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
          !isCustom ? '' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        Voll ({fullLabel})
      </button>
      <button type="button"
        onClick={() => { if (!isCustom) onChange(45) }}
        style={isCustom ? {borderColor:'var(--md-primary)', color:'var(--md-primary)'} : {}}
        className={`h-9 px-4 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
          isCustom ? '' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        Angepasst
      </button>
      {isCustom && (
        <div className="flex items-center gap-1">
          <button type="button"
            onClick={() => onChange(Math.max(1, value - 5))}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 text-lg font-medium flex items-center justify-center hover:bg-gray-100 active:scale-95">−</button>
          <input type="number" min="1" max="180"
            className="w-14 h-9 text-sm text-center border rounded-xl focus:outline-none font-medium"
            style={{borderColor:'var(--md-primary)'}}
            value={value}
            onChange={e => onChange(Math.max(1, Number(e.target.value)))}
          />
          <button type="button"
            onClick={() => onChange(value + 5)}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 text-lg font-medium flex items-center justify-center hover:bg-gray-100 active:scale-95">+</button>
          <span className="text-sm text-gray-500">Min.</span>
        </div>
      )}
    </div>
  )
}

// Counter for goals/assists
export function Counter({ value, label, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 text-xl font-medium flex items-center justify-center hover:bg-gray-50 active:scale-95">−</button>
        <span className="w-8 text-center text-lg font-semibold text-gray-900">{value}</span>
        <button type="button"
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 text-xl font-medium flex items-center justify-center hover:bg-gray-50 active:scale-95">+</button>
      </div>
    </div>
  )
}
