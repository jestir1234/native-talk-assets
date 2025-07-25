# Language File Fixing Scripts

These scripts help fix tokenized content matching issues between language files and structure files.

## Problem

Sometimes the sentences in `lang/en.json` don't match exactly with the tokenized content in `structure.json`. This causes the frontend algorithm to fail to find sentence boundaries.

Common issues:
- Extra spaces around quotes: `"」  小美有點為難。"` vs `"」小美有點為難。"`
- Missing spaces: `""一位客人..."` vs `""  一位客人..."`
- Sentence boundary mismatches

## Scripts

### 1. Fix Language File
```bash
node scripts/fix-language-file/fix-language-file-comprehensive.js <story-id>
```

**What it does:**
- Analyzes tokenized content vs language file sentences
- Identifies spacing and boundary issues
- Creates a fixed language file (`en-fixed.json`)
- Shows which sentences were fixed

**Example:**
```bash
node scripts/fix-language-file/fix-language-file-comprehensive.js taipei-blues
```

### 2. Test Fixed Language File
```bash
node scripts/fix-language-file/test-fixed-language-file.js <story-id>
```

**What it does:**
- Tests if the fixed language file works correctly
- Shows which sentences are found/not found
- Simulates the frontend algorithm

**Example:**
```bash
node scripts/fix-language-file/test-fixed-language-file.js taipei-blues
```

### 3. Check All Stories
```bash
node scripts/fix-language-file/check-all-stories.js
```

**What it does:**
- Checks all stories in the project
- Shows which stories have issues
- Provides a summary of working vs problematic stories

## Workflow

1. **Identify the problem story:**
   ```bash
   node scripts/fix-language-file/check-all-stories.js
   ```

2. **Fix the language file:**
   ```bash
   node scripts/fix-language-file/fix-language-file-comprehensive.js <story-id>
   ```

3. **Replace the original file:**
   ```bash
   cp stories/<story-id>/lang/en-fixed.json stories/<story-id>/lang/en.json
   ```

4. **Test the fix:**
   ```bash
   node scripts/fix-language-file/test-fixed-language-file.js <story-id>
   ```

## Success Indicators

- ✅ "All sentences found successfully!"
- ✅ 100% success rate in check-all-stories.js
- ✅ No "Sentences not found" in test output

## Notes

- The scripts work by building all possible sentences from tokenized content
- They use similarity matching to find close matches when exact matches fail
- The fixed files are written to `en-fixed.json` - you need to manually replace the original
- Always test after fixing to ensure the solution worked 