// =================================================================
// MYFINANCES AUTHENTICATION - PURE GOOGLE NATIVE AUTH
// =================================================================
const SPREADSHEET_ID = 'your-google-sheet-id-here'; // UPDATE: Your Google Sheet ID
// =================================================================

/**
 * Authentication entry point - Google handles everything natively
 */
function doGet(e) {
  try {
    // This automatically triggers Google's native login if user isn't authenticated
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      throw new Error('Unable to get user email - please ensure you are signed in to Google');
    }
    
    // Check spreadsheet access
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheets()[0];
      
      // Try to read first row to verify access
      const range = sheet.getRange(1, 1, 1, 1);
      const values = range.getValues();
      
      // Success - return simple JSON response
      const userData = {
        email: email,
        name: email.split('@')[0],
        timestamp: Date.now()
      };
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        user: userData
      })).setMimeType(ContentService.MimeType.JSON);
      
    } catch (error) {
      Logger.log('Spreadsheet access denied: ' + error.toString());
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: `Access denied. Please ask the sheet owner to share it with ${email}.`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    Logger.log('Auth error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =================================================================
// SETUP INSTRUCTIONS:
// =================================================================
// 
// 1. Update SPREADSHEET_ID with your actual Google Sheet ID
// 2. Deploy as Web App: Execute as "Me", Access "Anyone"
// 3. When users visit this URL, Google automatically prompts 
//    for sign-in if they're not authenticated
// 4. No custom UI needed - Google handles everything!
// =================================================================