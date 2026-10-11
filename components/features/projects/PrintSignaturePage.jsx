export function PrintSignaturePage({ documentTitle, projectName, parties = [] }) {
  return (
    <section className="print-signature-page hidden print:block">
      <header className="print-signature-page__title">
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
