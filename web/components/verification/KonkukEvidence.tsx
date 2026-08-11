"use client";

import {
  EvidenceFlowArrow,
  EvidenceFlowItem,
  EvidenceItem,
  getRowValue,
  type EvidenceProps,
} from "./EvidenceCommon";

export default function KonkukEvidence({
  row,
  status,
}: EvidenceProps) {
  return (
    <>
      <div className="verification-flow">
        <EvidenceFlowItem
          number="1"
          title="원본 학생부"
          description="전체 교과 및 학생부 데이터 확인"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="2"
          title="반영 기준"
          description="반영 교과와 이수단위 기준 적용"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="3"
          title="과목 판정"
          description="반영·제외 과목 및 가중점수 확인"
        />

        <EvidenceFlowArrow />

        <EvidenceFlowItem
          number="4"
          title="최종 계산"
          description="교과정량점수 재계산 및 비교"
        />
      </div>

      <div className="evidence-detail-grid">
        <EvidenceItem
          label="전체과목수"
          value={getRowValue(
            row,
            "전체과목수",
            "총과목수"
          )}
        />

        <EvidenceItem
          label="반영과목수"
          value={getRowValue(
            row,
            "반영과목수",
            "최종반영과목수"
          )}
        />

        <EvidenceItem
          label="제외과목수"
          value={getRowValue(
            row,
            "제외과목수",
            "미반영과목수"
          )}
        />

        <EvidenceItem
          label="학생부 보유학기수"
          value={getRowValue(
            row,
            "학생부보유학기수",
            "보유학기수"
          )}
        />

        <EvidenceItem
          label="반영이수단위"
          value={getRowValue(
            row,
            "반영이수단위합계",
            "반영이수단위"
          )}
        />

        <EvidenceItem
          label="가중점수합계"
          value={getRowValue(
            row,
            "가중점수합계",
            "가중점수"
          )}
        />

        <EvidenceItem
          label="교과산출점수"
          value={getRowValue(
            row,
            "교과산출점수10점",
            "교과산출점수"
          )}
        />

        <EvidenceItem
          label="교과정량 만점"
          value={getRowValue(
            row,
            "교과정량만점"
          )}
        />

        <EvidenceItem
          label="최종 교과정량점수"
          value={getRowValue(
            row,
            "해당전형교과정량점수",
            "교과정량점수"
          )}
        />

        <EvidenceItem
          label="비교내신"
          value={getRowValue(
            row,
            "비교내신확인",
            "비교내신"
          )}
        />

        <EvidenceItem
          label="KU지역균형 학기"
          value={getRowValue(
            row,
            "KU지역균형학기확인"
          )}
        />

        <EvidenceItem
          label="최종 상태"
          value={status}
        />
      </div>
    </>
  );
}