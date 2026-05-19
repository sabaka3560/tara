import * as WebBrowser from 'expo-web-browser'

export async function openInAppBrowser(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    toolbarColor: '#F8F9FF',
    controlsColor: '#12123B',
    enableDefaultShareMenuItem: true,
  })
}
