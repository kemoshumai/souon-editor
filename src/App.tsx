import { HStack, Stack, Theme } from '@chakra-ui/react';
import HeaderController from './HeaderController';

function App() {
  return (<>
    <Theme appearance='dark'>
      <Stack h={"100vh"} >
        <HStack w={"100vw"}>
          <HeaderController />
        </HStack>
      </Stack>
    </Theme>
  </>);
}

export default App;
