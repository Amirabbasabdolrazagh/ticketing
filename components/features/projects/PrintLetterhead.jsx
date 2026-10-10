import Image from "next/image";

/**
 * A real A4 letterhead layer for browser print / Save as PDF. Form values remain
 * live HTML, so the saved document is selectable and searchable rather than a
 * screenshot of the screen.
 */
export function PrintLetterhead() {
  return (
    <div className="print-letterhead hidden" aria-hidden="true">
      <Image
        src="/images/it-rasam-letterhead-a4.png"
        alt=""
        fill
        priority
        sizes="210mm"
        className="object-fill"
      />
    </div>
  );
}

export function PrintSignaturePage({ documentTitle, projectName, parties = [] }) {
  return (
    <section className="print-signature-page hidden print:block">
      <header className="print-signature-page__title">
        <p>شرکت ای‌تی رسام | راهکارهای فناوری اطلاعات</p>
        <h2>صفحه امضا و تأیید نهایی</h2>
        <span>{documentTitle}</span>
        {projectName ? <strong>پروژه: {projectName}</strong> : null}
      </header>

      <p className="print-signature-page__notice">
        با امضای این صفحه، طرفین صحت اطلاعات مندرج در فرم و دریافت نسخه چاپی آن را تأیید می‌کنند.
      </p>

      <div className="print-signature-page__grid">
        {parties.map((party) => (
          <article key={party.title} className="print-signature-page__box">
            <h3>{party.title}</h3>
            {party.name ? <p>نام و نام خانوادگی: {party.name}</p> : <p>نام و نام خانوادگی: ....................................</p>}
            {party.role ? <p>سمت: {party.role}</p> : <p>سمت: ....................................</p>}
            <p>تاریخ: ............................</p>
            <div className="print-signature-page__space">محل امضا و مهر</div>
          </article>
        ))}
      </div>

      <footer className="print-signature-page__footer">
        این صفحه جزء لاینفک {documentTitle} است و همراه آن بایگانی می‌شود.
      </footer>
    </section>
  );
}
