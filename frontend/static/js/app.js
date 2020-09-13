Vue.component("correction-view", {
  props: ["token"],
  data: function () {
    return {
      message: "",
      errors: [],
      correction: null,
      originalHadith: null,
      diff: null,
    };
  },
  created: function () {
    this.loadNextCorrection();
  },
  updated: async function () {
    if (
      this.correction &&
      this.originalHadith === null &&
      !this.loading &&
      this.errors.length === 0
    ) {
      await this.downloadHadith(this.correction.urn);
      if (this.correction.val) {
        this.checkDiff();
      }
      else {
        this.loadOriginal();
      }
    }
  },
  methods: {
    reset: function () {
      this.errors = [];
      this.correction = null;
      this.loading = false;
      this.originalHadith = null;
      this.diff = null;
    },
    loadOriginal: function () {
      if (this.correction && this.correction.attr && this.originalHadith) {
        this.correction.val = this.originalHadith[this.correction.attr];
      }
      this.checkDiff();
    },
    fetchJsonData: async function (url, body) {
      this.loading = true;
      try {
        const resp = await fetch(url, {
          method: body ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `token ${this.token}`,
          },
          body: body ? JSON.stringify(body) : null
        })
        if (resp.ok) {
          return resp.json();
        }
      }
      finally {
        this.loading = false;
      }
      throw new Error(`Http status ${resp.status}`);
    },
    loadNextCorrection: async function () {
      this.reset();
      try {
        const result = await this.fetchJsonData("/corrections");
        if (!result || result.length == 0) this.message = "No more corrections";
        else {
          this.correction = result[0];
        }
      }
      catch (err) {
        this.errors.push("Error loading correction.");
      }
    },
    downloadHadith: async function (hadithUrn) {
      try {
        const result = await this.fetchJsonData("/hadtihs/" + hadithUrn);
        if (result && result.length != 0) {
          for (var i = 0; i < result.hadith.length; i++) {
            if (result.hadith[i].lang === this.correction.lang) {
              this.originalHadith = result.hadith[i];
              break;
            }
          }
        }
      }
      catch (err) {
        this.errors.push("Error loading Hadith.");
      }
    },
    checkDiff: function () {
      const dmp = new diff_match_patch();
      this.diff = dmp.diff_prettyHtml(dmp.diff_main(
        this.originalHadith.body,
        this.correction.val
      )).replaceAll('&para;<br>', '<br/>');
    },
    accept: async function () {
      try {
        const result = await this.fetchJsonData(`/corrections/${this.correction.id}`, {
          action: 'approve',
          corrected_value: this.correction.val
        });
        this.message = result.message;
        if (result.success) {
          this.loadNextCorrection();
        }
      }
      catch (err) {
        this.errors.push(err.message);
      }
    },
    reject: async function () {
      try {
        const result = await this.fetchJsonData(`/corrections/${this.correction.id}`, {
          action: 'reject'
        });
        this.message = result.message
        if (result.success) {
          this.loadNextCorrection();
        }
      }
      catch (err) {
        this.errors.push(err.message);
      }
    },
  },
});

var app = new Vue({
  el: "#app",
});
