"use client";

import {
  useRef,
  type ChangeEvent,
  type DragEvent,
} from "react";

type ExcelUploaderProps = {
  files: File[];
  disabled?: boolean;
  onFilesSelect: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onClearFiles: () => void;
};

export default function ExcelUploader({
  files,
  disabled = false,
  onFilesSelect,
  onFileRemove,
  onClearFiles,
}: ExcelUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  function validateFiles(
    selectedFiles: File[]
  ) {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name
        .split(".")
        .pop()
        ?.toLowerCase();

      if (
        extension === "xlsx" ||
        extension === "xls" ||
        extension === "csv"
      ) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      alert(
        `Excel/CSV 파일(.xlsx, .xls, .csv)만 업로드할 수 있습니다.\n\n제외된 파일:\n${invalidFiles.join(
          "\n"
        )}`
      );
    }

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    validateFiles(selectedFiles);

    // 같은 파일을 다시 선택할 수 있도록 초기화
    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    const droppedFiles = Array.from(
      event.dataTransfer.files ?? []
    );

    if (droppedFiles.length === 0) {
      return;
    }

    validateFiles(droppedFiles);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
  }

  const totalSize = files.reduce(
    (sum, file) => sum + file.size,
    0
  );

  return (
    <section
      className={`content-card ${
        disabled ? "section-disabled" : ""
      }`}
    >
      <div className="card-heading">
        <div className="card-heading-main">
          <span className="section-index">
            02
          </span>

          <div>
            <h2>
              학생부 데이터 업로드
            </h2>

            <p>
              대학에서 제공받은 Excel 또는 CSV 파일을
              여러 개 선택하여 한 번에 업로드할 수 있습니다.
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <button
            type="button"
            className="secondary-outline-button"
            onClick={onClearFiles}
          >
            전체 삭제
          </button>
        )}
      </div>

      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="upload-icon">
          ↑
        </div>

        <strong>
          성적 데이터 파일을 업로드하세요
        </strong>

        <p>
          파일을 이 영역에 여러 개 끌어놓거나
          아래 버튼을 눌러 한 번에 선택할 수 있습니다.
        </p>

        <button
          type="button"
          className="primary-button"
          disabled={disabled}
          onClick={() =>
            inputRef.current?.click()
          }
        >
          파일 선택
        </button>

        <span className="upload-help">
          지원 형식: .xlsx, .xls, .csv / 다중 선택 가능
        </span>

        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".xlsx,.xls,.csv"
          disabled={disabled}
          onChange={handleFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="upload-file-section">
          <div className="upload-file-summary">
            <div>
              <span>
                선택된 파일
              </span>

              <strong>
                {files.length}개
              </strong>
            </div>

            <div>
              <span>
                전체 용량
              </span>

              <strong>
                {formatFileSize(totalSize)}
              </strong>
            </div>
          </div>

          <div className="upload-file-list">
            {files.map(
              (file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="upload-file-item"
                >
                  <div className="upload-file-info">
                    <div className="upload-file-number">
                      {index + 1}
                    </div>

                    <div>
                      <strong>
                        {file.name}
                      </strong>

                      <span>
                        {formatFileSize(
                          file.size
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="file-remove-button"
                    onClick={() =>
                      onFileRemove(index)
                    }
                  >
                    삭제
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function formatFileSize(
  bytes: number
) {
  if (bytes === 0) {
    return "0 KB";
  }

  const kb =
    bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb =
    kb / 1024;

  return `${mb.toFixed(2)} MB`;
}