
const commitVersionDisplay = document.getElementById("commit-version-display")!;
fetch("artifacts/VERSION").then(async res => {
    const v = await res.text();
    commitVersionDisplay.textContent = v;
});