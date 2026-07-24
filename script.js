const CONFIG = {
      projectName: 'وقف بناء دار الأيتام',
      charityName: 'جمعية إحياء التراث الإسلامي',
      branch: 'لجنة الدعوة والإرشاد',
      charityWhatsapp: '96596690217',
      whatsappCtaNumber: '96690217',
      appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyxxkI3k4vuTaQIPEsVIaOhDI4avp7Ji8iPeMkdEJZGAlfcAP5tfLZyYo547bVzVE2D0w/exec',
      logoUrl: logoBase64Data
    };

    const firebaseConfig = {
      apiKey: "AIzaSyD8UWWhGj8fibp8FXE0LOG60rYI4_RfuhI",
      authDomain: "ehdaa-charity.firebaseapp.com",
      databaseURL: "https://ehdaa-charity-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "ehdaa-charity",
      storageBucket: "ehdaa-charity.firebasestorage.app",
      messagingSenderId: "507588211763",
      appId: "1:507588211763:web:0d499b7c4d9cdaabdfdf46"
    };
    
    let db = null;
    if (firebaseConfig.apiKey !== "REPLACE_WITH_API_KEY" && typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
    }

    const els = {
      formMode: document.getElementById('formMode'),
      viewMode: document.getElementById('viewMode'),
      donorName: document.getElementById('donorName'),
      donorPhone: document.getElementById('donorPhone'),
      recipientName: document.getElementById('recipientName'),
      recipientPhone: document.getElementById('recipientPhone'),
      giftMessage: document.getElementById('giftMessage'),
      receiptNo: document.getElementById('receiptNo'),
      previewBtn: document.getElementById('previewBtn'),
      whatsappBtn: document.getElementById('whatsappBtn'),
      previewBox: document.getElementById('previewBox'),
      previewCardRecipient: document.getElementById('previewCardRecipient'),
      previewCardMessage: document.getElementById('previewCardMessage'),
      previewCardDonor: document.getElementById('previewCardDonor'),
      previewCardDate: document.getElementById('previewCardDate'),
      previewCard: document.getElementById('previewCard'),
      previewCardSignoff: document.getElementById('previewCardSignoff'),
      certRecipientName: document.getElementById('certRecipientName'),
      certGiftMessage: document.getElementById('certGiftMessage'),
      certGiftSignoff: document.getElementById('certGiftSignoff'),
      certDonorLine: document.getElementById('certDonorLine'),
      certDate: document.getElementById('certDate'),
      downloadPdfBtn: document.getElementById('downloadPdfBtn'),
      certificateCard: document.getElementById('certificateCard'),
      logoImages: Array.from(document.querySelectorAll('.js-logo'))
    };

    function normalizePhone(phone) {
      return String(phone || '').replace(/[^\d]/g, '');
    }

    function buildShareLink(giftId) {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('id', giftId);
      return url.toString();
    }

    async function saveGiftToSheet(data) {
      const payload = {
        project_name: data.projectName,
        donor_name: data.donorName,
        donor_phone: data.donorPhone,
        recipient_name: data.recipientName,
        recipient_phone: data.recipientPhone,
        gift_message: data.giftMessage,
        receipt_no: data.receiptNo
      };

      const response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.ok || !result.gift_id) {
        throw new Error(result.error || 'تعذر حفظ الإهداء');
      }

      return result;
    }

    async function loadGiftById(giftId) {
      if (!db) {
        throw new Error('Firebase is not configured');
      }
      const snapshot = await db.ref('gifts/' + giftId).once('value');
      const data = snapshot.val();
      if (!data) {
        throw new Error('Gift not found');
      }
      return data;
    }

    function makeWhatsappUrl(phone, text) {
      return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
    }

    function parseStoredDate(value) {
      if (!value) return new Date();
      if (value instanceof Date) return value;
      const str = String(value).trim();

      let match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0));
      }

      match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})$/);
      if (match) {
        return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), 0);
      }

      const parsed = new Date(str);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    function formatArabicDate(value) {
      const date = parseStoredDate(value);
      const datePart = new Intl.DateTimeFormat('ar-KW', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
      return datePart;
    }

    function todayLabel() {
      return formatArabicDate(new Date());
    }



    let logoReadyPromise = null;
    function ensureLogoReady() {
      if (logoReadyPromise) return logoReadyPromise;
      logoReadyPromise = (async () => {
        try {
          if (String(CONFIG.logoUrl || '').startsWith('data:')) {
            els.logoImages.forEach(img => { img.src = CONFIG.logoUrl; });
            return CONFIG.logoUrl;
          }
          const response = await fetch(CONFIG.logoUrl, { mode: 'cors', cache: 'force-cache' });
          if (!response.ok) throw new Error('logo_fetch_failed');
          const blob = await response.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          els.logoImages.forEach(img => { img.src = dataUrl; });
          return dataUrl;
        } catch (error) {
          console.error('Logo load failed:', error);
          return null;
        }
      })();
      return logoReadyPromise;
    }

    function getPayload() {
      const themeRadio = document.querySelector('input[name="cardTheme"]:checked');
      const fontSelector = document.getElementById('fontSelector');
      return {
        donorName: els.donorName.value.trim(),
        donorPhone: els.donorPhone.value.trim(),
        recipientName: els.recipientName.value.trim(),
        recipientPhone: els.recipientPhone.value.trim(),
        giftMessage: els.giftMessage.value.trim(),
        receiptNo: els.receiptNo.value.trim(),
        theme: themeRadio ? themeRadio.value : 'theme-green',
        fontFamily: fontSelector ? fontSelector.value : '"Aref Ruqaa", serif',
        projectName: CONFIG.projectName,
        charityName: CONFIG.charityName,
        branch: CONFIG.branch,
        dateLabel: todayLabel(),
        createdAt: new Date().toISOString()
      };
    }

    function validateForm() {
      let isValid = true;
      const requiredInputs = [
        els.donorName,
        els.donorPhone,
        els.recipientName,
        els.recipientPhone,
        els.giftMessage,
        els.receiptNo
      ];
      
      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          input.classList.add('is-invalid');
          isValid = false;
        } else {
          input.classList.remove('is-invalid');
        }
      });

      requiredInputs.forEach(input => {
        input.addEventListener('input', () => {
          if (input.value.trim()) {
            input.classList.remove('is-invalid');
          }
        }, { once: true });
      });

      if (!isValid) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'بيانات ناقصة',
            text: 'يرجى تعبئة جميع الحقول الإلزامية التي تحمل علامة (*) لاستكمال الإهداء.',
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#097834'
          });
        } else {
          alert('يرجى تعبئة جميع الحقول الإلزامية لاستكمال الإهداء.');
        }
      }
      return isValid;
    }

    
    function getCardElements(prefix) {
      if (prefix === 'previewCard') {
        return {
          recipientEl: els.previewCardRecipient,
          messageEl: els.previewCardMessage,
          signoffEl: els.previewCardSignoff,
          donorEl: els.previewCardDonor,
          dateEl: els.previewCardDate
        };
      }

      return {
        recipientEl: els.certRecipientName,
        messageEl: els.certGiftMessage,
        signoffEl: els.certGiftSignoff,
        donorEl: els.certDonorLine,
        dateEl: els.certDate
      };
    }

    function applyCardTextImages(prefix, data) {
      const { recipientEl, messageEl, signoffEl, donorEl, dateEl } = getCardElements(prefix);

      const theme = data.theme || 'theme-green';

      const themeColors = {
        'theme-green': { signoff: '#c7ac25', donor: '#c7ac25', date: '#c7ac25', message: '#065c27', recipient: '#c7ac25' },
        'theme-black': { signoff: '#c7ac25', donor: '#c7ac25', date: '#c7ac25', message: '#ffffff', recipient: '#c7ac25' },
        'theme-rose':  { signoff: '#d67a7a', donor: '#d67a7a', date: '#d67a7a', message: '#b55a5a', recipient: '#d67a7a' }
      };
      const colors = themeColors[theme] || themeColors['theme-green'];

      const selectedFont = data.fontFamily || '"Aref Ruqaa", serif';

      const applyStyles = (el, text, color) => {
        if (!el) return;
        if (el === messageEl) {
          el.innerHTML = String(text).replace(/\n/g, '<br>');
        } else {
          el.textContent = text;
        }
        el.style.color = color;
        el.style.fontFamily = selectedFont;
      };

      applyStyles(recipientEl, data.recipientName || '—', colors.recipient);
      applyStyles(messageEl, data.giftMessage || '—', colors.message);
      applyStyles(signoffEl, 'جزاكم الله خيرا', colors.signoff);
      applyStyles(donorEl, data.donorName || '—', colors.donor);
      applyStyles(dateEl, data.dateLabel || todayLabel(), colors.date);
    }

    async function renderPreview(data) {
      try {
        if (data.fontFamily && document.fonts) {
          try { await document.fonts.load(`16px ${data.fontFamily}`); } catch(e) {}
        }
        if (document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch(e) {}
        }
        await ensureLogoReady();
        applyCardTextImages('previewCard', data);

        const previewBox = document.getElementById('previewBox');
        if (!previewBox) return;

        // Remove any old rendered canvas preview
        const oldRender = previewBox.querySelector('.preview-render');
        if (oldRender) oldRender.remove();

        // Show the A4 card directly
        const a4Wrap = previewBox.querySelector('.a4-wrap');
        if (a4Wrap) a4Wrap.style.display = '';

        // Un-hide the preview box
        previewBox.classList.remove('hidden');

        // Wait a tick then adjust scaling
        await new Promise(r => setTimeout(r, 100));
        adjustCardScaling();

        // Scroll to preview
        previewBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Confetti celebration
        try { confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 }); } catch(e){}
      } catch (err) {
        console.error('Preview error:', err);
        alert('حدث خطأ أثناء تجهيز المعاينة. حاول مرة ثانية.');
      }
    }

    async function renderCertificate(data) {
      if (data.fontFamily) {
        document.documentElement.style.setProperty('--primary-font', data.fontFamily);
        if (document.fonts) {
          try { await document.fonts.load(`16px ${data.fontFamily}`); } catch(e) {}
        }
      }
      
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch(e) {}
      }

      await ensureLogoReady();
      const certCard = document.getElementById('certificateCard');
      if (certCard) {
        certCard.className = 'gift-card ' + (data.theme || 'theme-green');
      }
      
      
      applyCardTextImages('cert', data);
    }

    function showForm() {
      els.formMode.classList.remove('hidden');
      els.viewMode.classList.add('hidden');
      setTimeout(adjustCardScaling, 50);
    }

    function showView() {
      els.formMode.classList.add('hidden');
      els.viewMode.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'auto' });
      setTimeout(adjustCardScaling, 50);
      try { confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 }); } catch(e){}
    }

    function setLoadingState(isLoading) {
      document.documentElement.classList.toggle('gift-loading', !!isLoading);
      const screen = document.getElementById('loadingScreen');
      if (screen) screen.setAttribute('aria-hidden', String(!isLoading));
    }

    async function waitForImages(container, timeoutMs = 6000) {
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(images.map(img => new Promise(resolve => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        const timer = setTimeout(done, timeoutMs);
        const finish = () => {
          clearTimeout(timer);
          done();
        };

        if (img.complete) {
          finish();
          return;
        }

        img.addEventListener('load', finish, { once: true });
        img.addEventListener('error', finish, { once: true });
      })));
    }

    async function generatePdfBlobUrl(targetEl) {
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }
      await ensureLogoReady();
      await waitForImages(targetEl);
      await new Promise(r => setTimeout(r, 250));

      const waCtas = targetEl.querySelectorAll('.wa-cta');
      waCtas.forEach(btn => btn.style.display = 'none');
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: '#fbf6ef',
        useCORS: true,
        imageTimeout: 10000,
        logging: false,
        removeContainer: true,
        allowTaint: false,
        windowWidth: 980,
        windowHeight: 1400
      });

      waCtas.forEach(btn => btn.style.display = '');

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const usableW = pageW - (margin * 2);
      const usableH = pageH - (margin * 2);
      const ratio = Math.min(usableW / canvas.width, usableH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      return pdf;
    }

    async function downloadPdf(e) {
      if (e) e.preventDefault();

      const btn = e && e.currentTarget ? e.currentTarget : els.downloadPdfBtn || document.querySelector('.download-btn');
      const originalText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'جارٍ التحميل...';
      }

      try {
        const hasIdParam = new URLSearchParams(window.location.search).has('id');
        const liveData = hasIdParam ? null : getPayload();
        if (liveData && !validateForm()) {
          btn.classList.remove('loading');
          return;
        }
        await renderCertificate(liveData);

        const cardElement = document.getElementById('certificateCard') || document.querySelector('.gift-card');
        if (!cardElement) throw new Error('Gift card element not found');

        if (document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch (e2) {}
        }
        const logoDataUrl = await ensureLogoReady();
        if (!logoDataUrl) {
          // Hide logo to prevent tainted canvas security error in file:/// protocol
          els.logoImages.forEach(img => { img.style.display = 'none'; });
        }
        await waitForImages(cardElement);
        await new Promise(r => setTimeout(r, 180));

        // Temporarily disable scaling for clean html2canvas render
        const originalTransform = cardElement.style.transform;
        const originalTransformOrigin = cardElement.style.transformOrigin;
        
        cardElement.style.transform = 'none';
        cardElement.style.transformOrigin = 'unset';

        const waCtas = cardElement.querySelectorAll('.wa-cta');
        waCtas.forEach(btn => btn.style.display = 'none');

        const canvas = await html2canvas(cardElement, {
          scale: 3, // High resolution for professional print
          windowWidth: 1024,
          width: 794,
          useCORS: true,
          allowTaint: false, // We must NOT allow taint, otherwise toDataURL will crash
          backgroundColor: '#fbf6ef' // Preserve CSS background gradients
        });

        waCtas.forEach(btn => btn.style.display = '');

        // Restore scaling and logo
        cardElement.style.transform = originalTransform;
        cardElement.style.transformOrigin = originalTransformOrigin;
        if (!logoDataUrl) {
          els.logoImages.forEach(img => { img.style.display = ''; });
        }

        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // A4 dimensions: 210 x 297 mm
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save('بطاقة_إهداء_وقف_منابع_الخير.pdf');
      } catch (error) {
        console.error('Download error:', error);
        alert('حدث خطأ أثناء تحميل البطاقة.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }

    function openWhatsApp(url) {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = url;
      } else {
        const newTab = window.open(url, '_blank');
        if (!newTab) {
          window.location.href = url;
        }
      }
    }

    function generateShortId() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async function sendWhatsapp(e) {
      if (e) e.preventDefault();

      const data = typeof getPayload === 'function' ? getPayload() : {};
      if (!validateForm()) return;

      renderPreview(data).catch(err => console.error(err));

      const btn = els.whatsappBtn;
      let originalText = '';
      if (btn) {
        originalText = btn.innerHTML;
        btn.classList.add('loading');
        btn.innerHTML = 'جاري التجهيز...';
      }

      let giftId = '';
      const url = new URL(window.location.href);

      if (db) {
        giftId = generateShortId();
        try {
          await db.ref('gifts/' + giftId).set(data);
          url.searchParams.set('id', giftId);
        } catch (err) {
          console.error("Firebase save error:", err);
          alert('حدث خطأ أثناء حفظ الإهداء في قاعدة البيانات. تأكد من إعدادات Firebase.');
          const compressedData = LZString.compressToEncodedURIComponent(JSON.stringify(data));
          url.searchParams.set('id', compressedData);
        }
      } else {
        const compressedData = LZString.compressToEncodedURIComponent(JSON.stringify(data));
        url.searchParams.set('id', compressedData);
        console.warn('Firebase is not configured, falling back to long URL.');
      }

      const giftUrl = url.toString();

      if (btn) {
        btn.classList.remove('loading');
        btn.innerHTML = originalText;
      }
      
      const donorNameStr = data.donorName ? data.donorName : 'أحد محبيك';
      const recipientNameStr = data.recipientName ? data.recipientName : '';
      const projectNameStr = CONFIG.projectName || 'وقف منابع الخير';
      const charityNameStr = CONFIG.charityName || 'جمعية إحياء التراث الإسلامي';
      
      const textMessage = `السلام عليكم ورحمة الله وبركاته 🌷\n\nإلى الغالي ${recipientNameStr}، \n يهديك ${donorNameStr} \nأجر تبرعه في ${projectNameStr}. \nنسأل الله أن يكتب لكما الأجر 🤲\n\nلمشاهدة بطاقة الإهداء يرجى الضغط على الرابط التالي:\n `;

      const finalWhatsappText = textMessage + giftUrl + `\n\nإخوانكم في ${charityNameStr}`;

      const whatsappApiUrl = data.recipientPhone 
        ? makeWhatsappUrl(data.recipientPhone, finalWhatsappText)
        : `https://wa.me/?text=${encodeURIComponent(finalWhatsappText)}`;

      if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: 'إهداء',
            text: `السلام عليكم ورحمة الله وبركاته 🌷\n\nإلى الغالي ${recipientNameStr}، \n يهديك ${donorNameStr} \nأجر تبرعه في ${projectNameStr}. \nنسأل الله أن يكتب لكما الأجر 🤲\n\nلمشاهدة بطاقة الإهداء يرجى الضغط على الرابط التالي:\n `,
            url: giftUrl + `\n\nإخوانكم في ${charityNameStr}`
          });
        } catch (error) {
          console.log('Share failed or canceled, falling back to WhatsApp');
          openWhatsApp(whatsappApiUrl);
        }
      } else {
        openWhatsApp(whatsappApiUrl);
      }
    }

    function adjustCardScaling() {
      const wraps = document.querySelectorAll('.a4-wrap');
      wraps.forEach(wrap => {
        const card = wrap.querySelector('.gift-card');
        if (!card) return;
        const containerWidth = wrap.clientWidth;
        const scale = containerWidth / 794;
        if (scale < 1) {
          card.style.transform = `scale(${scale})`;
          card.style.transformOrigin = 'top center';
          wrap.style.height = `${1123 * scale}px`;
        } else {
          card.style.transform = '';
          card.style.transformOrigin = '';
          wrap.style.height = '';
        }
      });
    }

    async function initFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const giftId = params.get('id');

      if (!giftId) {
        showForm();
        setLoadingState(false);
        return;
      }

      setLoadingState(true);
      try {
        let data = null;
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(giftId);
          if (decompressed) {
            data = JSON.parse(decompressed);
          }
        } catch (decodeErr) {
          data = null;
        }

        if (!data) {
          data = await loadGiftById(giftId);
        }

        await renderCertificate(data);
        showView();
      } catch (e) {
        console.error(e);
        alert('تعذر تحميل بيانات بطاقة الإهداء.');
        showForm();
      } finally {
        setLoadingState(false);
      }
    }

    let livePreviewTimeout;
    function triggerLivePreview() {
      clearTimeout(livePreviewTimeout);
      livePreviewTimeout = setTimeout(async () => {
        const data = getPayload();
        await ensureLogoReady();
        applyCardTextImages('previewCard', data);
      }, 300);
    }

    [els.donorName, els.donorPhone, els.recipientName, els.recipientPhone, els.giftMessage, els.receiptNo].forEach(input => {
      if (input) input.addEventListener('input', triggerLivePreview);
    });

    document.querySelectorAll('input[name="cardTheme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const theme = e.target.value;
        const card = document.getElementById('previewCard');
        if (card) {
          card.className = 'gift-card ' + theme;
        }
        triggerLivePreview();
      });
    });

    const fontSelector = document.getElementById('fontSelector');
    if (fontSelector) {
      fontSelector.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--primary-font', e.target.value);
        triggerLivePreview();
      });
    }

    // Run once on load to populate preview box with defaults
    setTimeout(triggerLivePreview, 500);

    els.whatsappBtn.addEventListener('click', sendWhatsapp);
    els.downloadPdfBtn.addEventListener('click', downloadPdf);
    window.addEventListener('resize', adjustCardScaling);
    window.addEventListener('load', adjustCardScaling);
    initFromUrl();
