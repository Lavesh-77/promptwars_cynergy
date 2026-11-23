import type { Equipment } from "../types";

export default function EquipmentArt({ kind }: { kind: Equipment["visual"] }) {
  return (
    <svg
      className={`equipment-art art-${kind}`}
      viewBox="0 0 320 180"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="160"
        cy="153"
        rx="98"
        ry="10"
        fill="currentColor"
        opacity=".08"
      />
      {kind === "board" && (
        <g transform="rotate(-12 160 90)">
          <rect
            x="73"
            y="38"
            width="174"
            height="110"
            rx="7"
            fill="#137c7a"
            stroke="#075959"
            strokeWidth="3"
          />
          <path
            d="M95 69h44v40h47V68h36M103 126h35V98h53M153 49v20h56v62"
            stroke="#69c0a8"
            strokeWidth="2"
          />
          <rect x="138" y="69" width="42" height="43" rx="3" fill="#25383d" />
          <rect
            x="64"
            y="58"
            width="31"
            height="29"
            rx="3"
            fill="#c4cdd0"
            stroke="#84999c"
            strokeWidth="2"
          />
          <rect x="72" y="109" width="26" height="23" rx="3" fill="#283a40" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <g key={i}>
              <rect
                x={100 + i * 11}
                y="45"
                width="7"
                height="10"
                fill="#263b40"
              />
              <rect
                x={100 + i * 11}
                y="132"
                width="7"
                height="10"
                fill="#263b40"
              />
            </g>
          ))}
          <circle cx="222" cy="110" r="5" fill="#e2c45d" />
          <circle cx="222" cy="124" r="3" fill="#9ddd94" />
          <path
            d="M192 80h26m-26 8h17m-17 8h26"
            stroke="#dcf1e8"
            strokeWidth="2"
          />
        </g>
      )}
      {kind === "scope" && (
        <g>
          <path d="M72 51l16-11h164l-10 14" fill="#c2c7c7" />
          <rect
            x="68"
            y="49"
            width="178"
            height="98"
            rx="8"
            fill="#e1e4e2"
            stroke="#b7bdbc"
            strokeWidth="2"
          />
          <rect x="79" y="62" width="107" height="69" rx="3" fill="#253c42" />
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M83 ${75 + i * 14}h99`}
              stroke="#456169"
              strokeWidth=".6"
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${92 + i * 16} 65v62`}
              stroke="#456169"
              strokeWidth=".6"
            />
          ))}
          <path
            d="M83 99h10l7-24 9 46 9-37 9 15h10l8-22 9 42 8-31 8 11h13"
            stroke="#9ae6a3"
            strokeWidth="2"
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx="204" cy={74 + i * 23} r="7" fill="#9aa9a7" />
              <circle cx="228" cy={74 + i * 23} r="5" fill="#aeb8b6" />
            </g>
          ))}
          <path d="M87 147v6m140-6v6" stroke="#667a79" strokeWidth="7" />
        </g>
      )}
      {kind === "printer" && (
        <g>
          <path
            d="M100 139V37h121v102M110 135V47h101v88"
            stroke="#343e41"
            strokeWidth="9"
          />
          <path d="M101 44h119M104 79h114" stroke="#8c9698" strokeWidth="4" />
          <path d="M157 38v90m35-90v90" stroke="#9da8a8" strokeWidth="3" />
          <rect x="145" y="68" width="32" height="26" rx="3" fill="#e58c47" />
          <path d="M158 95v10" stroke="#414b4d" strokeWidth="4" />
          <path d="M85 135h151l-15 14H99z" fill="#e58c47" />
          <path d="M119 121h87l15 12H103z" fill="#566365" />
          <path d="M140 119v-13l17-9 17 9v13" fill="#93b8a2" />
          <rect x="91" y="144" width="142" height="8" rx="3" fill="#343e41" />
          <rect x="199" y="127" width="38" height="22" rx="3" fill="#343e41" />
          <rect x="204" y="132" width="21" height="10" fill="#9bc4ca" />
        </g>
      )}
      {kind === "workstation" && (
        <g>
          <rect x="63" y="41" width="139" height="90" rx="5" fill="#334348" />
          <rect x="70" y="48" width="125" height="74" rx="2" fill="#b9d1ce" />
          <path
            d="M81 105l23-23 17 10 22-28 19 18 21-20"
            stroke="#3a8e76"
            strokeWidth="3"
          />
          <path d="M81 58h37m-37 7h24" stroke="#6a9c92" strokeWidth="3" />
          <path d="M133 131v15m-23 3h46" stroke="#5f7072" strokeWidth="6" />
          <rect x="217" y="54" width="43" height="96" rx="4" fill="#45565a" />
          <rect x="224" y="63" width="29" height="67" rx="3" fill="#283d42" />
          <circle cx="239" cy="83" r="12" stroke="#7eb6a3" strokeWidth="3" />
          <circle cx="239" cy="111" r="12" stroke="#7eb6a3" strokeWidth="3" />
          <circle cx="239" cy="140" r="2" fill="#a2e2a0" />
        </g>
      )}
    </svg>
  );
}
