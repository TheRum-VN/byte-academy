import { Link } from 'react-router';
import { ArrowRight, GraduationCap } from '@phosphor-icons/react';
import { ByteMascot, GameBadge } from '../components/ui';
export function Landing() {
  return (
    <main className="landing">
      <Link className="landing-brand" to="/">
        BYTE ACADEMY
      </Link>
      <section>
        <div>
          <GameBadge>Dành cho học sinh tiểu học lớp 1–5</GameBadge>
          <h1>
            Máy tính có bao điều thú vị.
            <br />
            Cùng Byte khám phá nhé!
          </h1>
          <p>
            Không gian học Tin học bằng tương tác: chuột, bàn phím, tệp tin,
            tiếng Việt và an toàn số.
          </p>
          <div className="landing-actions">
            <Link className="primary-link" to="/play">
              Em là học sinh
              <ArrowRight size={22} />
            </Link>
            <Link className="secondary-link" to="/admin/login">
              <GraduationCap size={22} />
              Em chào thầy cô
            </Link>
          </div>
          <p className="development">
            Nền tảng đang phát triển · Phòng học đã sẵn sàng để tham gia
          </p>
        </div>
        <ByteMascot className="landing-mascot" />
      </section>
    </main>
  );
}
