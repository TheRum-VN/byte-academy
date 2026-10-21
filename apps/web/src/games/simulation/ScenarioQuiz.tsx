import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { type SimulationCommand, type SimulationState } from '@byte/shared';
import { Sprite, GameButton } from '../../components/ui';
export function ScenarioQuiz({
  state,
  disabled,
  onCommand,
}: {
  state: SimulationState;
  disabled: boolean;
  onCommand: (command: SimulationCommand) => Promise<boolean>;
}) {
  const [feedback, setFeedback] = useState('');
  if (state.definition.kind === 'dismiss')
    return (
      <div className="safety-scene">
        <Sprite atlas="15" name="privacy_shield" className="safety-hero" />
        <h2>Em làm chủ màn hình của mình</h2>
        {!state.dismissed ? (
          <section
            className="unwanted-window"
            aria-label="Thông báo không mong muốn"
          >
            <header>
              <span>Thông báo mô phỏng</span>
              <button
                aria-label="Đóng cửa sổ không mong muốn"
                disabled={disabled}
                onClick={() => void onCommand({ domain: 'dismiss' })}
              >
                <X size={25} />
              </button>
            </header>
            <Sprite atlas="15" name="warning_triangle" />
            <h3>“Nhận quà ngay!”</h3>
            <p>
              Một cửa sổ không mong muốn đã xuất hiện. Em hãy tìm nút đóng thật
              ở thanh tiêu đề.
            </p>
            <button
              className="soft-button"
              disabled={disabled}
              onClick={() =>
                setFeedback(
                  'Đây là lời mời trong thông báo. Hãy tìm dấu đóng ở góc trên cửa sổ.',
                )
              }
            >
              Nhận quà mô phỏng
            </button>
          </section>
        ) : (
          <div className="safe-complete">
            <Sprite atlas="15" name="shield_check" />
            <p>
              Thông báo đã đóng. Khi thấy điều đáng ngờ, em có thể nhờ người lớn
              kiểm tra.
            </p>
          </div>
        )}
        <p role="status">{feedback}</p>
      </div>
    );
  const questions = state.definition.questions ?? [],
    question = questions.find((q) => !state.answers[q.id]);
  return (
    <div className="scenario-quiz">
      {question ? (
        <>
          <div className="quiz-progress">
            Câu {questions.indexOf(question) + 1} / {questions.length}
          </div>
          <h2>{question.prompt}</h2>
          <div className="scenario-choices">
            {question.choices.map((c) => (
              <button
                key={c.id}
                disabled={disabled}
                onClick={() =>
                  void onCommand({
                    domain: 'quiz',
                    questionId: question.id,
                    choiceId: c.id,
                  }).then((ok) => {
                    if (ok) setFeedback(c.reason);
                  })
                }
              >
                <Sprite atlas={c.atlas} name={c.sprite} />
                <strong>{c.text}</strong>
                <span>Chọn cách của em</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="safe-complete">
          <Sprite atlas="15" name="shield_check" />
          <h2>Em đã tìm được các lựa chọn đúng</h2>
          <p>Bấm Nộp bài để máy chủ lưu kết quả.</p>
          <GameButton disabled onClick={() => {}}>
            Đã trả lời {questions.length} câu
          </GameButton>
        </div>
      )}
      <p className="quiz-feedback" role="status">
        {feedback || 'Hãy quan sát và chọn. Nếu chưa đúng, em có thể thử lại.'}
      </p>
      <p className="simulation-note">
        Mọi tình huống đều là mô phỏng. Không nhập mật khẩu, địa chỉ hay thông
        tin riêng thật.
      </p>
    </div>
  );
}
