"use client";

export type UniversityCode =
  | "swu"
  | "snut"
  | "gachon"
  | "konkuk"
  | "khu";

type University = {
  code: UniversityCode;
  shortName: string;
  fullName: string;
  enabled: boolean;
};

type UniversitySelectorProps = {
  selectedUniversity: UniversityCode | null;
  onSelect: (university: UniversityCode) => void;
};

const universities: University[] = [
  {
    code: "swu",
    shortName: "숭의여대",
    fullName: "숭의여자대학교",
    enabled: true,
  },
  {
    code: "snut",
    shortName: "서울과기대",
    fullName: "서울과학기술대학교",
    enabled: false,
  },
  {
    code: "gachon",
    shortName: "가천대",
    fullName: "가천대학교",
    enabled: false,
  },
  {
    code: "konkuk",
    shortName: "건국대",
    fullName: "건국대학교",
    enabled: true,
  },
  {
    code: "khu",
    shortName: "경희대",
    fullName: "경희대학교",
    enabled: false,
  },
];

export default function UniversitySelector({
  selectedUniversity,
  onSelect,
}: UniversitySelectorProps) {
  return (
    <section className="content-card">
      <div className="card-heading">
        <div className="card-heading-main">
          <span className="section-index">01</span>

          <div>
            <h2>대학교 선택</h2>

            <p>
              성적 검증을 진행할 대학교를 선택해주세요.
            </p>
          </div>
        </div>
      </div>

      <div className="university-grid">
        {universities.map((university) => {
          const isSelected =
            selectedUniversity === university.code;

          return (
            <button
              key={university.code}
              type="button"
              disabled={!university.enabled}
              className={[
                "university-card",
                isSelected ? "selected" : "",
                !university.enabled ? "disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!university.enabled) {
                  return;
                }

                onSelect(university.code);
              }}
            >
              <div className="university-card-header">
                <strong>
                  {university.shortName}
                </strong>

                {university.enabled ? (
                  <span
                    className={[
                      "university-status",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isSelected
                      ? "선택됨"
                      : "검증 가능"}
                  </span>
                ) : (
                  <span className="university-status disabled">
                    준비 중
                  </span>
                )}
              </div>

              <p className="university-full-name">
                {university.fullName}
              </p>

              {isSelected && (
                <div className="selected-indicator">
                  ✓ 현재 검증 대상으로 선택되었습니다.
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}