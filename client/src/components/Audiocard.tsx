import { Box, Container, Flex, Modal, ModalContent, ModalOverlay, Stack, useDisclosure } from "@chakra-ui/react";
import React, { useCallback, useState } from "react";
import { baseUrl } from "../utils/baseUrl";
import axios from "axios";

function Audiocard({ data, token }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [details, setDetails] = useState(null);
  const [isLoading, setisLoading] = useState(false);

  const handleFetchDetails = useCallback(async () => {
    try {
      onOpen();
      setisLoading(true);
      const { data: a } = await axios.get(`${baseUrl}/api/user/getYtbDetails/${data?.ytbId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      //   console.log("---getAudioTranscript---", data);
      setDetails(a?.data);
      setisLoading(false);
    } catch (error) {
      console.error(error);
      setisLoading(false);
    }
  }, [data]);

  return (
    <>
      <Stack cursor={"pointer"} p={"8px"} bg={"#eee"} rounded={"8px"} onClick={handleFetchDetails}>
        <Box>{data.title}</Box>
        <Box>
          {data.status === 3 ? (
            <Box color={"green"} fontWeight={"bold"} fontSize={"12px"}>
              Completed
            </Box>
          ) : data.status === 2 ? (
            <Box color={"orange"} fontWeight={"bold"} fontSize={"12px"}>
              Creating chunks
            </Box>
          ) : (
            <Box color={"orange"} fontWeight={"bold"} fontSize={"12px"}>
              Processing
            </Box>
          )}
        </Box>
      </Stack>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxH={"80vh"} overflow={"auto"} pt={"20px"}>
          <Container maxH={"80vh"}>
            {details && (
              <Stack textAlign={"center"} spacing={"22px"}>
                <Flex direction={"column"}>
                  <Box fontWeight={"bold"} fontSize={"15px"} mb={"10px"}>
                    Title
                  </Box>
                  <Box>{details?.title}</Box>
                </Flex>
                {details?.summary && (
                  <Flex direction={"column"}>
                    <Box fontWeight={"bold"} fontSize={"15px"} mb={"10px"}>
                      Summary
                    </Box>
                    <Box maxH={"100px"} overflow={"auto"}>
                      {details?.summary}
                    </Box>
                  </Flex>
                )}
                {details?.segments?.length > 0 && (
                  <Flex direction={"column"} pb={"20px"}>
                    <Box fontWeight={"bold"} fontSize={"15px"} mb={"10px"}>
                      Chunks
                    </Box>
                    <Stack spacing={"20px"}>
                      {details?.segments?.map((sg, i) => (
                        <Box key={i} maxH={"100px"} overflow={"auto"}>
                          {sg?.text}
                        </Box>
                      ))}
                    </Stack>
                  </Flex>
                )}
              </Stack>
            )}
          </Container>
        </ModalContent>
      </Modal>
    </>
  );
}

export default Audiocard;
