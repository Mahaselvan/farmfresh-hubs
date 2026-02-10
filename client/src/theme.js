import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800"
      }
    }
  },
  colors: {
    brand: {
      50: "#e9f9ee",
      100: "#c7efd4",
      200: "#a2e4b8",
      300: "#7bd99c",
      400: "#52cf80",
      500: "#35b666",
      600: "#27904f",
      700: "#1f6f3e",
      800: "#174e2c",
      900: "#0d2e1a"
    }
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "green"
      }
    }
  }
});

export default theme;
