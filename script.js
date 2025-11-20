// 페이지의 DOM이 모두 준비된 뒤에 실행
document.addEventListener('DOMContentLoaded', () => {
    /* ========== 야간 모드 ========== */
    const toggleDark = document.getElementById('toggle-dark');
    if (toggleDark) {
        toggleDark.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }

    /* ========== 아코디언 ========== */
    document.querySelectorAll('.accordion-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const acc = btn.closest('.accordion');
            if (acc) acc.classList.toggle('show');
        });
    });

    /* ========== 현재 섹션 하이라이트 ========== */
    const links = document.querySelectorAll('.top-nav .nav-links a');
    const sections = [...document.querySelectorAll('main section')];
    if (links.length && sections.length && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        const id = `#${e.target.id}`;
                        links.forEach((a) =>
                            a.classList.toggle('active', a.getAttribute('href') === id)
                        );
                    }
                });
            },
            { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
        );
        sections.forEach((s) => obs.observe(s));
    }

    /* ========== Top 버튼 ========== */
    const toTop = document.getElementById('to-top');
    if (toTop) {
        const onScroll = () => {
            toTop.classList.toggle('show', window.scrollY > 600);
        };
        window.addEventListener('scroll', onScroll);
        onScroll();
        toTop.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: 'smooth' })
        );
    }

    /* ========== 모바일 nav-links 스크롤 힌트 ========== */
    const navLinks = document.querySelector('.top-nav .nav-links');
    if (navLinks) {
        const updateNavFade = () => {
            navLinks.classList.toggle('scrolled', navLinks.scrollLeft > 0);
        };
        navLinks.addEventListener('scroll', updateNavFade);
        window.addEventListener('resize', updateNavFade);
        updateNavFade();
    }

    // === 감상평 ===
    const FB_API = "https://script.google.com/macros/s/AKfycbynP9oTSXEhhiPxRYyfLEO8VN4iwLbzRSIQ1gJWJH3rM2lzVjzUnt3rqlNSmdIgcs7C/exec";
    let fbAll = [];   // 전체 데이터 캐시
    let fbPage = 0;   // 현재 페이지 (0 = 처음)

    async function loadFeedback(reset = true) {
        try {
            const r = await fetch(FB_API);
            const { ok, rows } = await r.json();
            if (!ok) return;

            fbAll = rows; // 전체 캐시
            fbPage = 0;   // 첫 페이지부터
            renderFeedback(reset);
        } catch (e) {
            console.warn(e);
        }
    }

    function renderFeedback(reset = true) {
        const ul = document.getElementById("fb-ul");
        const moreBtn = document.getElementById("fb-more");

        if (reset) ul.innerHTML = "";

        // 페이지당 20개
        const start = fbPage * 20;
        const end = start + 20;
        const slice = fbAll.slice(start, end);

        ul.insertAdjacentHTML(
            "beforeend",
            slice.map(item => {
                const time = new Date(item.timestamp);
                const tstr = time.toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
                return `<li class="fb-item">
                ${item.name ? `<span class="fb-name">${escapeHtml(item.name)}</span>` : ""}
                <span class="fb-time">${tstr}</span><br>
                <span class="fb-msg">${escapeHtml(item.message)}</span>
            </li>`;
            }).join("")
        );

        fbPage++;

        // 더 불러올 게 있으면 버튼 보이기
        moreBtn.style.display = fbAll.length > fbPage * 20 ? "block" : "none";
    }

    // "더 보기" 버튼 클릭
    document.getElementById("fb-more")?.addEventListener("click", () => {
        renderFeedback(false);
    });

    // === 등록 이벤트 ===
    document.getElementById('fb-form')?.addEventListener('submit', async (ev) => {
        ev.preventDefault();

        const form = ev.currentTarget;
        const status = document.getElementById('fb-status');

        status.textContent = "전송 중…";

        // ✅ 필드가 없어도 안전하게 값을 빼오도록 방어 코딩
        const nameInput = form.querySelector('[name="name"]');      // 선택사항(없어도 OK)
        const msgInput = form.querySelector('[name="message"], textarea[name="message"]');
        const sectionInput = form.querySelector('[name="section"]');   // 선택사항(없어도 OK)

        const payload = {
            name: (nameInput?.value ?? '').trim(),                 // 없으면 빈 문자열
            message: (msgInput?.value ?? '').trim(),                 // 반드시 있어야 함
            section: (sectionInput?.value ?? 'general').trim()        // 없으면 'general'
        };

        if (!payload.message || payload.message.length < 2) {
            status.textContent = "두 글자 이상 입력해주세요.";
            return;
        }

        try {
            const r = await fetch(FB_API, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const res = await r.json();

            if (res.ok) {
                // 낙관적 렌더링 + 리셋
                const ul = document.getElementById('fb-ul');
                const nowStr = new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                ul.insertAdjacentHTML('afterbegin',
                    `<li class="fb-item">
          ${payload.name ? `<span class="fb-name">${escapeHtml(payload.name)}</span>` : ""}
          <span class="fb-time">${nowStr}</span><br>
          <span class="fb-msg">${escapeHtml(payload.message)}</span>
        </li>`);

                form.reset();
                status.textContent = "등록되었습니다!";
                loadFeedback({ reset: true }); // 더보기 로직 쓰고 있으면 새로고침 겸 초기화
            } else {
                status.textContent = "등록 실패(잠시 후 다시 시도해주세요).";
            }
        } catch (e) {
            status.textContent = "네트워크 오류(잠시 후 재시도).";
        }
    });

    // XSS 방지
    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, m =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
        );
    }

    // 최초 로드
    loadFeedback();
});