import { fingerFor, fingerNames, keyboardRows } from '@byte/shared';
import { Sprite } from '../../components/ui';
export function VirtualKeyboard({
  next,
  held,
  compact = false,
}: {
  next?: string;
  held: Set<string>;
  compact?: boolean;
}) {
  const finger = fingerFor(next ?? '');
  return (
    <div className={`keyboard-assembly ${compact ? 'compact' : ''}`}>
      <div className="virtual-keyboard" aria-label="Bàn phím QWERTY hướng dẫn">
        {keyboardRows.map((row, i) => (
          <div className="key-row" key={i}>
            {row.map((key) => (
              <div
                key={key.code}
                data-code={key.code}
                className={`virtual-key finger-${key.finger} ${finger === key.finger ? 'finger-group' : ''} ${next === key.code ? 'next-key' : ''} ${held.has(key.code) ? 'held-key' : ''}`}
                style={{ flexGrow: key.width }}
                aria-label={`${key.label}, ${fingerNames[key.finger]}${next === key.code ? ', phím tiếp theo' : ''}`}
              >
                {key.label}
                {['KeyF', 'KeyJ'].includes(key.code) && (
                  <span className="home-bump" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!compact && (
        <>
          <div className="typing-hands">
            <Sprite
              atlas="07"
              name={
                finger?.startsWith('left-')
                  ? `left_${finger.split('-')[1]}_press`
                  : finger === 'thumb'
                    ? 'left_thumb_space'
                    : 'left_home'
              }
              alt="Bàn tay trái nhìn từ trên xuống"
            />
            <div className="finger-cue">
              <Sprite atlas="08" name="keycap_pressed" />
              <strong>
                {finger ? fingerNames[finger] : 'Hai tay nghỉ trên hàng cơ sở'}
              </strong>
              <small>F và J có gờ định vị</small>
            </div>
            <Sprite
              atlas="07"
              name={
                finger?.startsWith('right-')
                  ? `right_${finger.split('-')[1]}_press`
                  : 'right_home'
              }
              alt="Bàn tay phải nhìn từ trên xuống"
            />
          </div>
          <p className="keyboard-footnote">
            Dùng bàn phím thật · Phím ảo chỉ để quan sát · Vị trí theo QWERTY,
            kể cả khi máy dùng layout khác.
          </p>
        </>
      )}
    </div>
  );
}
