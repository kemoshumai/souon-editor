import { HStack, Stack, Text, Theme } from '@chakra-ui/react';
import styles from './App.module.css';

function App() {
  return (<>
    <Theme appearance='dark'>
      <Stack h={"100vh"} >
        <HStack w={"100vw"}>
          <Text>Hello, World.</Text>
        </HStack>
        <Text>Hello, World.</Text>
      </Stack>
    </Theme>
  </>);
}

export default App;
