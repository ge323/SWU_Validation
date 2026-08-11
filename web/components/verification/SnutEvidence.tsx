"use client";

import {
  EvidenceFlowArrow,
  EvidenceFlowItem,
  EvidenceItem,
  getRowValue,
  type EvidenceProps,
} from "./EvidenceCommon";

export default function SnutEvidence({
  row,
  status,
}: EvidenceProps) {
  return (
    <>
      {/* =====================================================
          검증 흐름
      ====================================================== */}

      <div className="verification-flow">
        <EvidenceFlowItem
          number="1"
          title="전형 기준 확인"
          description="전형유형과 평가 기준 확인"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="2"
          title="반영 과목 선정"
          description="대학 기준에 따라 최종 반영 과목 선정"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="3"
          title="학생부 환산"
          description="이수단위와 가중점수를 이용해 환산점수 계산"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="4"
          title="최종 검증"
          description="대학 제공 환산점수와 재계산 결과 비교"
        />
      </div>

      {/* =====================================================
          핵심 검증 결과
      ====================================================== */}

      <div className="evidence-detail-grid">
        <EvidenceItem
          label="전형명"
          value={getRowValue(
            row,
            "전형명"
          )}
        />

        <EvidenceItem
          label="모집단위"
          value={getRowValue(
            row,
            "모집단위명"
          )}
        />

        <EvidenceItem
          label="평가구분"
          value={getRowValue(
            row,
            "평가구분"
          )}
        />

        <EvidenceItem
          label="최종 반영 과목수"
          value={getRowValue(
            row,
            "최종반영과목수"
          )}
        />

        <EvidenceItem
          label="최종 반영 이수단위"
          value={getRowValue(
            row,
            "최종반영이수단위합",
            "반영이수단위"
          )}
        />

        <EvidenceItem
          label="가중점수 합계"
          value={getRowValue(
            row,
            "가중점수합",
            "가중점수합계"
          )}
        />

        <EvidenceItem
          label="환산점수 원값"
          value={getRowValue(
            row,
            "학생부환산점수원값"
          )}
        />

        <EvidenceItem
          label="재계산 환산점수"
          value={getRowValue(
            row,
            "학생부환산점수"
          )}
        />

        <EvidenceItem
          label="대학 제공 환산점수"
          value={getRowValue(
            row,
            "환산점수"
          )}
        />

        <EvidenceItem
          label="환산점수 일치"
          value={formatBooleanValue(
            getRowValue(
              row,
              "환산점수일치"
            )
          )}
        />

        <EvidenceItem
          label="지원자격 판정"
          value={getRowValue(
            row,
            "지원자격판정"
          )}
        />

        <EvidenceItem
          label="검증 상태"
          value={
            getRowValue(
              row,
              "검증상태"
            ) ?? status
          }
        />
      </div>

      {/* =====================================================
          계산 기준
      ====================================================== */}

      <div className="evidence-rule-box">
        <div>
          <span>
            적용 계산 기준
          </span>

          <strong>
            {String(
              getRowValue(
                row,
                "적용계산기준"
              ) ?? "-"
            )}
          </strong>
        </div>

        <div>
          <span>
            검증 메시지
          </span>

          <strong>
            {String(
              getRowValue(
                row,
                "검증메시지"
              ) ?? "-"
            )}
          </strong>
        </div>
      </div>
    </>
  );
}

function formatBooleanValue(
  value: unknown
) {
  if (
    value === true ||
    value === "true" ||
    value === "TRUE" ||
    value === 1 ||
    value === "1"
  ) {
    return "일치";
  }

  if (
    value === false ||
    value === "false" ||
    value === "FALSE" ||
    value === 0 ||
    value === "0"
  ) {
    return "불일치";
  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}