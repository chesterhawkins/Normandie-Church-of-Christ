const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Patches the generated Podfile with two fixes:
 *
 * 1. inhibit_all_warnings! — inserted before the first `target` block so
 *    CocoaPods adds -w (suppress ALL warnings) when generating xcconfigs for
 *    each pod. This is the most reliable way to suppress the
 *    "non-virtual member function marked 'override' hides virtual member
 *    function" error from react-native-maps, react-native-reanimated, etc.
 *    It works at the CocoaPods level before pod install, so post-install
 *    build-setting patches can't override it.
 *
 * 2. -DFOLLY_CFG_NO_COROUTINES=1 in post_install — prevents Folly from
 *    enabling coroutine support (folly/coro/Coroutine.h is not present in
 *    RN 0.81's snapshot). Still needed because -w doesn't affect preprocessor
 *    defines.
 *
 * A versioned sentinel comment guards against double-patching.
 */
const SENTINEL = "# [withCxx20-v7] applied";

/**
 * Finds the line index of the closing `end` for the `post_install` block by
 * matching indentation — more reliable than searching for the last `end` in
 * the file, which could be a different block entirely.
 */
function findPostInstallEndIdx(lines) {
  let startIdx = -1;
  let startIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    if (/post_install\s+do\s+\|installer\|/.test(lines[i])) {
      startIdx = i;
      startIndent = lines[i].search(/\S/); // leading spaces of this line
      if (startIndent < 0) startIndent = 0;
      break;
    }
  }

  if (startIdx === -1) return -1;

  // Scan forward for an `end` at the same indent level as `post_install`.
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "end") {
      const indent = lines[i].search(/\S/);
      if ((indent < 0 ? 0 : indent) === startIndent) {
        return i;
      }
    }
  }

  return -1;
}

const withCxx20 = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      // Skip only if THIS exact version of the patch is already present.
      // Older patches (v1/v2/v3/v4/v5/v6) used a different sentinel so they
      // won't block this from running even if the Podfile was cached by EAS.
      if (contents.includes(SENTINEL)) {
        return config;
      }

      // Insert before the first `target '...' do` line:
      //   inhibit_all_warnings! — CocoaPods adds -w to every pod's xcconfig
      //   at pod install time, suppressing overloaded-virtual and all other
      //   pod warnings before Xcode ever sees the build settings.
      if (!contents.includes("inhibit_all_warnings!")) {
        contents = contents.replace(
          /^(target ['"])/m,
          `inhibit_all_warnings!\n\n$1`
        );
      }

      const patch = `
  ${SENTINEL}
  # Fix: -DFOLLY_CFG_NO_COROUTINES=1 — prevent Folly coroutine headers
  #      (folly/coro/Coroutine.h) from being pulled in on RN 0.81.
  #      The overloaded-virtual warning is handled by inhibit_all_warnings!
  #      inserted before the target block (see top of Podfile).
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      flags = config.build_settings['OTHER_CPLUSPLUSFLAGS']
      flags = flags.is_a?(Array) ? flags.join(' ') : (flags || '$(inherited)')
      flags += ' -DFOLLY_CFG_NO_COROUTINES=1' unless flags.include?('-DFOLLY_CFG_NO_COROUTINES')
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags
    end
  end
`;

      const lines = contents.split("\n");
      const endIdx = findPostInstallEndIdx(lines);

      if (endIdx !== -1) {
        // Insert patch just before the closing `end` of the post_install block.
        lines.splice(endIdx, 0, patch);
        contents = lines.join("\n");
      } else {
        // Fallback: insert right after the opening of post_install.
        const marker = "post_install do |installer|";
        if (contents.includes(marker)) {
          contents = contents.replace(marker, `${marker}\n${patch}`);
        } else {
          contents = contents.replace(
            /post_install\s+do\s+\|installer\|/,
            (m) => `${m}\n${patch}`
          );
        }
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withCxx20;
