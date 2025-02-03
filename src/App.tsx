import { Bleed, Flex, HStack, Theme } from '@chakra-ui/react';
import HeaderController from './HeaderController';
import SequentialEditor from './SequentialEditor';

function App() {
  return (<>
    <Theme appearance='dark'>
      <Flex h={"100vh"} w={"100vw"} direction={"column"} >
        <HStack w={"100vw"}>
          <HeaderController />
        </HStack>
        <Bleed flex={1} bgColor={"gray.900"}>
          <SequentialEditor />
        </Bleed>
      </Flex>
    </Theme>
  </>);
}

export default App;
